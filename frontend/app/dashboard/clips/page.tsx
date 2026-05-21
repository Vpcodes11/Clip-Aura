"use client";

import React, { useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpDown, ExternalLink, FileVideo, Play, Plus, Search, Share2 } from "lucide-react";
import EditorModal from "@/components/EditorModal";
import ExportModal from "@/components/ExportModal";
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
  if (!duration) return "";
  if (typeof duration === "string") return duration;
  return `${duration.toFixed(duration % 1 === 0 ? 0 : 1)}s`;
}

function ClipSkeletonGrid() {
  return (
    <section className="clip-grid" aria-label="Loading clips">
      {[0, 1, 2, 3].map((item) => (
        <article className="clip-skeleton" key={item}>
          <div className="skeleton-preview shimmer" />
          <div className="skeleton-body">
            <span className="skeleton-line shimmer wide" />
            <span className="skeleton-line shimmer short" />
            <div className="skeleton-actions">
              <span className="skeleton-button shimmer" />
              <span className="skeleton-square shimmer" />
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

export default function ClipsPage() {
  const searchParams = useSearchParams();
  const filterJobId = searchParams.get("job");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [query, setQuery] = useState("");
  const [activeEditorClip, setActiveEditorClip] = useState<{ jobId: string; clip: Clip; clipIndex: number } | null>(null);
  const [activeExportClip, setActiveExportClip] = useState<{ jobId: string; clip: Clip; clipIndex: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareMessage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("newest");

  const hasActiveRef = useRef(false);

  const fetchJobs = React.useCallback(async () => {
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await authenticatedFetch(`${apiUrl}/api/jobs`);
      if (!res.ok) throw new Error("Could not load generated clips.");
      const data = await res.json();
      setJobs(data);
      hasActiveRef.current = data.some((job: Job) =>
        ["queued", "downloading", "processing"].includes(job.status),
      );
    } catch (err) {
      console.error("Failed to fetch clips:", err);
      setError(err instanceof Error ? err.message : "Could not load generated clips.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useLayoutEffect(() => {
    const id = setTimeout(() => fetchJobs(), 0);
    const interval = setInterval(() => {
      fetchJobs();
    }, hasActiveRef.current ? 5000 : 12000);
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

  const filteredClips = useMemo(() => {
    const filtered = clips.filter((clip) => {
      if (filterJobId && clip.jobId !== filterJobId) return false;
      const needle = query.trim().toLowerCase();
      if (!needle) return true;
      return `${clip.title} ${clip.hook_caption || ""} ${clip.source || ""}`.toLowerCase().includes(needle);
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === "virality") return (b.virality_score || 0) - (a.virality_score || 0);
      if (sortBy === "longest") {
        const durA = typeof a.duration === "number" ? a.duration : parseFloat(String(a.duration || "0")) || 0;
        const durB = typeof b.duration === "number" ? b.duration : parseFloat(String(b.duration || "0")) || 0;
        return durB - durA;
      }
      return b.clipIndex - a.clipIndex;
    });
  }, [clips, query, sortBy, filterJobId]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const showEmptyState = !isLoading && clips.length === 0;
  const showNoSearchResults = !isLoading && clips.length > 0 && filteredClips.length === 0;

  const togglePreviewPlayback = (video: HTMLVideoElement) => {
    if (video.paused) {
      video.play().catch(() => undefined);
    } else {
      video.pause();
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

      <ExportModal
        key={activeExportClip?.clip?.filename || "export-none"}
        isOpen={activeExportClip !== null}
        onClose={() => setActiveExportClip(null)}
        jobId={activeExportClip?.jobId || ""}
        clip={activeExportClip?.clip || null}
        clipIndex={activeExportClip?.clipIndex ?? 0}
      />

      <section className="clips-hero">
        <div>
          <h1>Clips</h1>
          <p>Your AI-generated shorts. Edit, preview, or export them.</p>
        </div>
        <div className="hero-tools">
          <div className="sort-bar">
            <ArrowUpDown size={14} />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
              <option value="newest">Newest first</option>
              <option value="virality">Highest score</option>
              <option value="longest">Longest</option>
            </select>
          </div>
          <div className="search-box">
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clips..." />
        </div>
        </div>
      </section>

      {filterJobId && (
        <div className="filter-chip-row">
          <span className="filter-chip">
            Filtered by project
            <Link href="/dashboard/clips" className="filter-clear">&times;</Link>
          </span>
        </div>
      )}

      {(error || shareMessage) && (
        <div className={`notice ${error ? "error" : ""}`}>
          {error || shareMessage}
        </div>
      )}

      {isLoading && clips.length === 0 ? (
        <ClipSkeletonGrid />
      ) : showEmptyState ? (
        <div className="empty-space">
          <FileVideo size={34} />
          <h2>No clips yet</h2>
          <p>Create a project first, and generated clips will appear here.</p>
          <Link className="start-link" href="/dashboard">
            <Plus size={16} />
            Create a project
          </Link>
        </div>
      ) : showNoSearchResults ? (
        <div className="empty-space compact">
          <Search size={28} />
          <h2>No matching clips</h2>
          <p>Try a different title, hook, or source search.</p>
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
                  onClick={(event) => togglePreviewPlayback(event.currentTarget)}
                />
                <div className="play-badge-overlay">
                  <Play size={22} className="play-icon" fill="currentColor" />
                </div>
                {clip.virality_score > 0 && <span className="score">{clip.virality_score}</span>}
                {clip.duration && <span className="duration">{formatDuration(clip.duration)}</span>}
              </div>

              <div className="body">
                <h3>{clip.title}</h3>
                <div className="clip-meta">
                  {clip.virality_score > 0 && <span>Score {clip.virality_score}</span>}
                  {clip.duration && <span>{formatDuration(clip.duration)}</span>}
                </div>
                <div className="actions">
                  <button onClick={() => setActiveEditorClip({ jobId: clip.jobId, clip, clipIndex: clip.clipIndex })} className="edit-btn">
                    <ExternalLink size={14} />
                    Edit
                  </button>
                  <button onClick={() => setActiveExportClip({ jobId: clip.jobId, clip, clipIndex: clip.clipIndex })} className="export-btn">
                    <Share2 size={14} />
                    Export
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
          gap: clamp(18px, 3vw, 24px);
        }

        .clips-hero {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          animation: fadeSlide 0.32s ease both;
        }

        h1 {
          font-size: clamp(32px, 5vw, 48px);
          line-height: 1;
          margin-bottom: 6px;
        }

        .clips-hero p {
          color: var(--muted);
          line-height: 1.5;
          max-width: 42ch;
        }

        .hero-tools {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sort-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 0 12px;
          min-height: 40px;
          background: rgba(255, 255, 255, 0.045);
          color: var(--muted);
          flex-shrink: 0;
        }

        .sort-select {
          background: transparent;
          border: 0;
          color: var(--muted-strong);
          font-size: 13px;
          font-weight: 650;
          outline: 0;
          cursor: pointer;
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
          width: min(100%, 280px);
          min-height: 40px;
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
          animation: fadeSlide 0.32s ease both;
        }

        .clip-card {
          border-radius: 18px;
          overflow: hidden;
          transition: transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1), border-color 0.25s ease, box-shadow 0.25s ease;
        }

        .clip-card:hover {
          transform: translateY(-4px) scale(1.02);
          border-color: var(--accent);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
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
          transition: transform 0.3s ease;
          cursor: pointer;
        }

        .clip-card:hover .preview video {
          transform: scale(1.06);
        }

        .play-badge-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.3);
          opacity: 0;
          transition: opacity 0.25s ease, background-color 0.25s ease;
          pointer-events: none;
          z-index: 2;
        }

        .clip-card:hover .play-badge-overlay {
          opacity: 1;
        }

        .play-icon {
          color: #ffffff;
          transform: scale(0.8);
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .clip-card:hover .play-icon {
          transform: scale(1.1);
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
          padding: 14px;
        }

        .body h3 {
          min-height: 38px;
          font-size: 14px;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .clip-meta {
          margin-top: 7px;
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
          color: var(--muted);
          font-size: 11px;
          font-weight: 700;
        }

        .clip-meta:empty {
          display: none;
        }

        .clip-meta span {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .actions button {
          flex: 1;
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
          transition: all 0.2s ease;
          touch-action: manipulation;
        }

        .actions button:hover {
          color: #ffffff;
          border-color: var(--accent);
          background: rgba(246, 92, 139, 0.1);
        }

        .empty-space {
          min-height: 380px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          text-align: center;
          color: var(--muted);
        }

        .empty-space.compact {
          min-height: 260px;
        }

        .clip-skeleton {
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          overflow: hidden;
          background: rgba(10, 13, 22, 0.78);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 18px 60px rgba(0, 0, 0, 0.22);
        }

        .skeleton-preview {
          aspect-ratio: 9 / 16;
        }

        .skeleton-body {
          padding: 14px;
          display: grid;
          gap: 10px;
        }

        .skeleton-line,
        .skeleton-button,
        .skeleton-square {
          display: block;
          border-radius: 999px;
          height: 12px;
        }

        .skeleton-line.wide {
          width: 82%;
        }

        .skeleton-line.short {
          width: 52%;
          opacity: 0.72;
        }

        .skeleton-actions {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }

        .skeleton-button {
          flex: 1;
          height: 34px;
          border-radius: 10px;
        }

        .skeleton-square {
          width: 38px;
          height: 34px;
          border-radius: 10px;
        }

        .shimmer {
          position: relative;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.075);
        }

        .shimmer::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.13), transparent);
          animation: shimmer 1.35s ease-in-out infinite;
        }

        .empty-space h2 {
          color: #ffffff;
          font-size: 22px;
        }

        .start-link {
          margin-top: 8px;
          min-height: 40px;
          border-radius: 10px;
          padding: 0 16px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
        }

        .start-link:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        @media (max-width: 640px) {
          .clips-hero {
            flex-direction: column;
            align-items: stretch;
            gap: 14px;
          }

          .search-box {
            width: 100%;
            min-height: 44px;
          }

          .clip-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .clip-card:hover {
            transform: none;
          }

          .clip-card:hover .preview video {
            transform: none;
          }

          .play-badge-overlay {
            opacity: 1;
            background: rgba(0, 0, 0, 0.18);
          }

          .body {
            padding: 12px;
          }

          .actions {
            gap: 6px;
          }

          .actions button {
            min-height: 38px;
            padding: 0 9px;
          }

          .actions button:first-child {
            min-width: 0;
          }
        }

        @media (max-width: 420px) {
          .clip-grid {
            grid-template-columns: 1fr;
          }
        }

        @keyframes fadeSlide {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shimmer {
          to {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

