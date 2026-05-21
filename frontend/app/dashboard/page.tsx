"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  Plus,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";
import UploadModal from "@/components/UploadModal";
import { authenticatedFetch } from "@/lib/supabase";
import type { Clip } from "@/components/EditorModal";

interface Job {
  id: string;
  status: string;
  progress?: number;
  message?: string;
  source?: string;
  clips?: Clip[];
}

const activeStatuses = ["queued", "downloading", "processing"];

function projectName(job: Job) {
  if (!job.source) return `Project ${job.id}`;
  try {
    const url = new URL(job.source);
    return url.hostname.replace(/^www\./, "") + url.pathname;
  } catch {
    return job.source;
  }
}

function statusLabel(status: string) {
  if (status === "complete") return "Ready";
  if (status === "error") return "Issue";
  if (status === "queued") return "Queued";
  if (status === "downloading") return "Importing";
  if (status === "processing") return "Generating";
  return status;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "complete") return <CheckCircle2 size={18} />;
  if (status === "error") return <AlertTriangle size={18} />;
  if (activeStatuses.includes(status)) return <Loader2 className="spin" size={18} />;
  return <Clock3 size={18} />;
}

export default function Dashboard() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const hasActiveRef = useRef(false);

  const fetchJobs = React.useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await authenticatedFetch(`${apiUrl}/api/jobs`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
        hasActiveRef.current = data.some((job: Job) => activeStatuses.includes(job.status));
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useLayoutEffect(() => {
    const id = setTimeout(() => fetchJobs(), 0);
    const interval = setInterval(() => {
      if (hasActiveRef.current) {
        fetchJobs();
      }
    }, 3000);
    return () => {
      clearTimeout(id);
      clearInterval(interval);
    };
  }, [fetchJobs]);

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Delete this project and all generated clips?")) return;
    setDeletingJobId(jobId);
    setActionError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await authenticatedFetch(`${apiUrl}/api/job/${jobId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete project. Please try again.");
      setJobs((prev) => prev.filter((job) => job.id !== jobId));
    } catch (err) {
      console.error("Failed to delete project:", err);
      setActionError(err instanceof Error ? err.message : "Could not delete project. Please try again.");
    } finally {
      setDeletingJobId(null);
    }
  };

  const readyCount = useMemo(() => jobs.filter((j) => j.status === "complete").length, [jobs]);
  const activeCount = useMemo(() => jobs.filter((j) => activeStatuses.includes(j.status)).length, [jobs]);

  const visibleJobs = jobs.filter((job) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return `${job.id} ${job.source || ""} ${job.status}`.toLowerCase().includes(needle);
  });

  const showEmptyState = !isLoading && jobs.length === 0;

  return (
    <div className="clean-dashboard">
      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} onUploadStarted={fetchJobs} />

      <section className="dashboard-hero">
        <div>
          <h1>Projects</h1>
          <p>Import a video and let AI find the best moments.</p>
        </div>
        <button className="primary-action" onClick={() => setIsUploadOpen(true)}>
          <Plus size={18} />
          New project
        </button>
      </section>

      {showEmptyState ? (
        <section className="empty-guide">
          <div className="empty-guide-card upload" onClick={() => setIsUploadOpen(true)}>
            <UploadCloud size={28} />
            <h2>Upload a video</h2>
            <p>MP4, MOV, or WEBM — up to 2 GB</p>
          </div>
          <div className="empty-guide-card url" onClick={() => setIsUploadOpen(true)}>
            <Plus size={28} />
            <h2>Paste a link</h2>
            <p>YouTube, Vimeo, or any public video URL</p>
          </div>
        </section>
      ) : (
        <section className="project-panel">
          <div className="panel-top">
            <div>
              <h2>
                {visibleJobs.length} project{visibleJobs.length !== 1 ? "s" : ""}
                {activeCount > 0 && <span className="active-badge">{activeCount} active</span>}
                {readyCount > 0 && <span className="ready-badge">{readyCount} ready</span>}
              </h2>
              {actionError && <div className="inline-error">{actionError}</div>}
            </div>
            <div className="search-box">
              <Search size={15} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects..." />
            </div>
          </div>

          <div className="project-table">
            {isLoading && jobs.length === 0 && (
              <div className="empty-state">
                <Loader2 className="spin" size={18} />
                Loading projects...
              </div>
            )}

            {!isLoading && visibleJobs.length === 0 && (
              <div className="empty-state">
                No projects match your search.
              </div>
            )}

            {visibleJobs.map((job) => {
              const progress = Math.max(0, Math.min(100, job.progress || (job.status === "complete" ? 100 : 0)));
              return (
                <article key={job.id} className={`project-row ${job.status}`}>
                  <div className="source-cell">
                    <span className="status-icon"><StatusIcon status={job.status} /></span>
                    <div>
                      <h3>{projectName(job)}</h3>
                      <small>{job.id}</small>
                      {job.status === "error" && job.message && (
                        <details><summary>View issue</summary>{job.message}</details>
                      )}
                    </div>
                  </div>
                  <div className="meta-cell">
                    <span className={`status-pill ${job.status}`}>{statusLabel(job.status)}</span>
                    <span className="clip-badge">{job.clips?.length || 0} clip{(job.clips?.length || 0) !== 1 ? "s" : ""}</span>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="row-actions">
                    {job.status === "complete" && <Link href="/dashboard/clips">View clips</Link>}
                    <button onClick={() => handleDeleteJob(job.id)} title="Delete project" disabled={deletingJobId === job.id}>
                      {deletingJobId === job.id ? <Loader2 className="spin" size={15} /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <style jsx>{`
        .clean-dashboard {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .dashboard-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        h1 {
          font-size: clamp(32px, 5vw, 48px);
          line-height: 1;
          margin-bottom: 8px;
        }

        .dashboard-hero p {
          color: var(--muted);
          line-height: 1.5;
          max-width: 42ch;
        }

        .inline-error {
          width: fit-content;
          margin-top: 12px;
          border: 1px solid rgba(239, 68, 68, 0.22);
          border-radius: 10px;
          padding: 9px 11px;
          background: rgba(239, 68, 68, 0.08);
          color: #fca5a5;
          font-size: 13px;
          font-weight: 700;
        }

        .primary-action {
          min-height: 46px;
          border-radius: 12px;
          padding: 0 18px;
          background: #ffffff;
          color: #05060a;
          font-weight: 800;
          white-space: nowrap;
          border: 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .empty-guide {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        .empty-guide-card {
          min-height: 180px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
          background: rgba(10, 13, 22, 0.62);
          cursor: pointer;
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }

        .empty-guide-card:hover {
          transform: translateY(-2px);
          border-color: rgba(6, 182, 212, 0.28);
          background: rgba(10, 13, 22, 0.82);
        }

        .empty-guide-card svg {
          color: var(--accent-2);
        }

        .empty-guide-card h2 {
          font-family: var(--font-outfit);
          font-size: 20px;
        }

        .empty-guide-card p {
          color: var(--muted);
          font-size: 14px;
          line-height: 1.5;
        }

        .project-panel {
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(10, 13, 22, 0.78);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 18px 60px rgba(0, 0, 0, 0.22);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-radius: 20px;
          overflow: hidden;
        }

        .panel-top {
          padding: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .panel-top h2 {
          font-size: 18px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .active-badge,
        .ready-badge {
          font-family: var(--font-inter);
          font-size: 12px;
          font-weight: 700;
          border-radius: 999px;
          padding: 3px 9px;
        }

        .active-badge {
          background: rgba(6, 182, 212, 0.12);
          color: #67e8f9;
        }

        .ready-badge {
          background: rgba(16, 185, 129, 0.12);
          color: #86efac;
        }

        .search-box {
          flex: 1;
          max-width: 280px;
          min-height: 40px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 0 13px;
          display: flex;
          align-items: center;
          gap: 9px;
          color: var(--muted);
          background: rgba(255, 255, 255, 0.045);
        }

        .search-box input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #ffffff;
          font-size: 14px;
        }

        .project-table {
          display: grid;
        }

        .project-row {
          display: grid;
          grid-template-columns: minmax(220px, 1fr) 220px auto;
          gap: 16px;
          align-items: center;
          min-height: 72px;
          padding: 16px 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
        }

        .project-row:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .source-cell {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .status-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          color: var(--accent-2);
          background: rgba(255, 255, 255, 0.06);
        }

        .project-row.complete .status-icon {
          color: #86efac;
        }

        .project-row.error .status-icon {
          color: #fca5a5;
        }

        .source-cell h3 {
          max-width: 440px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 14px;
        }

        .source-cell small {
          color: var(--muted);
          font-size: 12px;
        }

        details {
          margin-top: 4px;
          max-width: 440px;
          font-size: 12px;
          line-height: 1.45;
          color: var(--muted);
        }

        details summary {
          color: #fca5a5;
          cursor: pointer;
          width: fit-content;
        }

        .meta-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-pill {
          border-radius: 999px;
          padding: 4px 8px;
          font-size: 12px;
          font-weight: 800;
          background: rgba(255, 255, 255, 0.06);
          color: var(--muted-strong);
          white-space: nowrap;
        }

        .status-pill.complete {
          color: #86efac;
        }

        .status-pill.error {
          color: #fca5a5;
        }

        .status-pill.queued,
        .status-pill.downloading,
        .status-pill.processing {
          color: #67e8f9;
        }

        .clip-badge {
          color: var(--muted);
          font-size: 12px;
          font-weight: 650;
          white-space: nowrap;
        }

        .progress-bar {
          width: 60px;
          height: 5px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.08);
        }

        .progress-bar-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #06b6d4, #7c3aed);
          transition: width 0.4s ease;
        }

        .row-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }

        .row-actions a {
          min-height: 32px;
          border-radius: 9px;
          padding: 0 10px;
          background: rgba(255, 255, 255, 0.08);
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
          color: inherit;
          display: inline-flex;
          align-items: center;
        }

        .row-actions button {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.045);
          color: var(--muted);
          border: 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .row-actions button:hover {
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.1);
        }

        .empty-state {
          min-height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--muted);
          font-size: 14px;
        }

        .spin {
          animation: spin 1.1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 860px) {
          .project-row {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .meta-cell {
            flex-wrap: wrap;
          }

          .row-actions {
            justify-content: flex-start;
          }

          .empty-guide {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .dashboard-hero {
            flex-direction: column;
            align-items: stretch;
          }

          .primary-action {
            width: 100%;
            justify-content: center;
          }

          .panel-top {
            flex-direction: column;
            align-items: stretch;
          }

          .search-box {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
