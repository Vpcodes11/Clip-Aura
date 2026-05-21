"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, ExternalLink, FileVideo, Search, Share2, Sparkles } from "lucide-react";
import EditorModal from "@/components/EditorModal";
import type { Clip } from "@/components/EditorModal";
import { authenticatedFetch } from "@/lib/supabase";

interface Job {
  id: string;
  status: string;
  source?: string;
  clips?: Clip[];
}

type ClipWithJob = Clip & {
  jobId: string;
  clipIndex: number;
  source?: string;
};

function formatDuration(duration?: string | number) {
  if (!duration) return "0:30";
  if (typeof duration === "string") return duration;
  return `${duration.toFixed(duration % 1 === 0 ? 0 : 1)}s`;
}

export default function ClipsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [query, setQuery] = useState("");
  const [activeEditorClip, setActiveEditorClip] = useState<{ jobId: string; clip: Clip; clipIndex: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const fetchJobs = React.useCallback(async () => {
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await authenticatedFetch(`${apiUrl}/api/jobs`);
      if (!res.ok) throw new Error("Could not load generated clips.");
      setJobs(await res.json());
    } catch (err) {
      console.error("Failed to fetch clips:", err);
      setError(err instanceof Error ? err.message : "Could not load generated clips.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useLayoutEffect(() => {
    const id = setTimeout(() => fetchJobs(), 0);
    const interval = setInterval(fetchJobs, 12000);
    return () => {
      clearTimeout(id);
      clearInterval(interval);
    };
  }, [fetchJobs]);

  const clips = useMemo<ClipWithJob[]>(
    () =>
      jobs.flatMap((job) =>
        (job.clips || []).map((clip, clipIndex) => ({
          ...clip,
          jobId: job.id,
          clipIndex,
          source: job.source,
        })),
      ),
    [jobs],
  );

  const filteredClips = clips.filter((clip) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return `${clip.title} ${clip.hook_caption || ""} ${clip.source || ""}`.toLowerCase().includes(needle);
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const handleShare = async (clip: ClipWithJob) => {
    const previewUrl = `${apiUrl}/api/preview/${clip.jobId}/${clip.filename}`;
    setShareMessage(null);
    try {
      if (navigator.share) {
        await navigator.share({
          title: clip.title,
          text: clip.hook_caption || clip.title,
          url: previewUrl,
        });
        setShareMessage("Share sheet opened.");
      } else {
        await navigator.clipboard.writeText(previewUrl);
        setShareMessage("Clip link copied.");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("Failed to share clip:", err);
      setShareMessage("Could not share this clip.");
    }
  };

  return (
    <div className="clips-page">
      <EditorModal
        key={activeEditorClip?.clip?.filename || "none"}
        isOpen={activeEditorClip !== null}
        onClose={() => setActiveEditorClip(null)}
        jobId={activeEditorClip?.jobId || ""}
        clip={activeEditorClip?.clip || null}
        clipIndex={activeEditorClip?.clipIndex ?? 0}
        onSaveSuccess={fetchJobs}
      />

      <section className="clips-hero">
        <div>
          <span className="eyebrow">
            <Sparkles size={14} />
            Clip review
          </span>
          <h1>Generated clips</h1>
          <p>Review, edit, download, and prepare your generated shorts without crowding the project queue.</p>
        </div>
        <div className="search-box">
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clips..." />
        </div>
      </section>

      {(error || shareMessage) && (
        <div className={`notice ${error ? "error" : ""}`}>
          {error || shareMessage}
        </div>
      )}

      {isLoading && clips.length === 0 ? (
        <div className="empty-space">
          <FileVideo size={28} />
          Loading clips...
        </div>
      ) : filteredClips.length === 0 ? (
        <div className="empty-space">
          <FileVideo size={34} />
          <h2>No clips found</h2>
          <p>Completed projects with generated clips will appear here.</p>
        </div>
      ) : (
        <section className="clip-grid">
          {filteredClips.map((clip, index) => (
            <motion.article
              key={`${clip.jobId}-${clip.filename}`}
              className="clip-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
            >
              <div className="preview">
                <video
                  src={`${apiUrl}/api/preview/${clip.jobId}/${clip.filename}`}
                  muted
                  playsInline
                  onMouseOver={(event) => event.currentTarget.play()}
                  onMouseOut={(event) => event.currentTarget.pause()}
                />
                <span className="score">Score {clip.virality_score}</span>
                <span className="duration">{formatDuration(clip.duration)}</span>
              </div>

              <div className="body">
                <h3>{clip.title}</h3>
                <p>{clip.source || `Project ${clip.jobId}`}</p>
                <div className="actions">
                  <button onClick={() => setActiveEditorClip({ jobId: clip.jobId, clip, clipIndex: clip.clipIndex })}>
                    <ExternalLink size={15} />
                    Edit
                  </button>
                  <button onClick={() => window.open(`${apiUrl}/api/download/${clip.jobId}/${clip.filename}`)}>
                    <Download size={15} />
                  </button>
                  <button onClick={() => handleShare(clip)}>
                    <Share2 size={15} />
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </section>
      )}

      <style jsx>{`
        .clips-page {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .clips-hero {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--accent-2);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        h1 {
          font-size: clamp(36px, 5vw, 56px);
          line-height: 1;
        }

        .clips-hero p,
        .body p,
        .empty-space p {
          color: var(--muted);
          margin-top: 8px;
          line-height: 1.6;
        }

        .search-box,
        .clip-card,
        .empty-space,
        .notice {
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(10, 13, 22, 0.78);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 18px 60px rgba(0, 0, 0, 0.22);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .notice {
          width: fit-content;
          border-radius: 12px;
          padding: 10px 13px;
          color: var(--muted-strong);
          font-size: 13px;
          font-weight: 750;
        }

        .notice.error {
          border-color: rgba(239, 68, 68, 0.22);
          background: rgba(239, 68, 68, 0.08);
          color: #fca5a5;
        }

        .search-box {
          width: min(100%, 360px);
          min-height: 46px;
          border-radius: 12px;
          padding: 0 13px;
          display: flex;
          align-items: center;
          gap: 9px;
          color: var(--muted);
        }

        .search-box input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #ffffff;
          font-size: 14px;
        }

        .clip-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }

        .clip-card {
          border-radius: 18px;
          overflow: hidden;
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .clip-card:hover {
          transform: translateY(-2px);
          border-color: rgba(6, 182, 212, 0.28);
        }

        .preview {
          position: relative;
          aspect-ratio: 9 / 16;
          background: #05060a;
          overflow: hidden;
        }

        .preview video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .score,
        .duration {
          position: absolute;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.62);
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          padding: 5px 8px;
        }

        .score {
          left: 10px;
          top: 10px;
          color: #fde68a;
        }

        .duration {
          right: 10px;
          bottom: 10px;
        }

        .body {
          padding: 15px;
        }

        .body h3 {
          min-height: 40px;
          font-size: 15px;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .body p {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 12px;
        }

        .actions {
          display: flex;
          gap: 8px;
          margin-top: 14px;
        }

        .actions button {
          min-height: 34px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          background: rgba(255, 255, 255, 0.045);
          color: var(--muted-strong);
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
        }

        .actions button:first-child {
          flex: 1;
        }

        .actions button:hover {
          color: #ffffff;
          border-color: rgba(6, 182, 212, 0.28);
          background: rgba(6, 182, 212, 0.1);
        }

        .empty-space {
          min-height: 420px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          text-align: center;
          color: var(--muted);
        }

        .empty-space h2 {
          color: #ffffff;
          font-size: 24px;
        }

        @media (max-width: 820px) {
          .clips-hero {
            align-items: stretch;
            flex-direction: column;
          }

          .search-box {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
