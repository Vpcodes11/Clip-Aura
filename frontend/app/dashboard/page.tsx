"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileVideo,
  Link2,
  Loader2,
  Plus,
  Search,
  Sparkles,
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
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "complete" | "error">("all");

  const fetchJobs = React.useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await authenticatedFetch(`${apiUrl}/api/jobs`);
      if (res.ok) setJobs(await res.json());
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchJobs();
    const hasActive = jobs.some((job) => activeStatuses.includes(job.status));
    const interval = setInterval(fetchJobs, hasActive ? 3000 : 12000);
    return () => clearInterval(interval);
  }, [fetchJobs, jobs]);

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Delete this project and all generated clips?")) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await authenticatedFetch(`${apiUrl}/api/job/${jobId}`, { method: "DELETE" });
      if (res.ok) setJobs((prev) => prev.filter((job) => job.id !== jobId));
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  const counts = useMemo(() => {
    const active = jobs.filter((job) => activeStatuses.includes(job.status)).length;
    const ready = jobs.filter((job) => job.status === "complete").length;
    const issues = jobs.filter((job) => job.status === "error").length;
    const clips = jobs.reduce((total, job) => total + (job.clips?.length || 0), 0);
    return { active, ready, issues, clips };
  }, [jobs]);

  const visibleJobs = jobs.filter((job) => {
    if (filter === "active" && !activeStatuses.includes(job.status)) return false;
    if (filter === "complete" && job.status !== "complete") return false;
    if (filter === "error" && job.status !== "error") return false;

    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return `${job.id} ${job.source || ""} ${job.status}`.toLowerCase().includes(needle);
  });

  return (
    <div className="clean-dashboard">
      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />

      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">
            <Sparkles size={14} />
            Workspace
          </span>
          <h1>Projects</h1>
          <p>Import long-form videos and monitor generation status. Review finished clips in the Clips space.</p>
        </div>
        <button className="primary-action" onClick={() => setIsUploadOpen(true)}>
          <Plus size={18} />
          New project
        </button>
      </section>

      <section className="start-strip">
        <button className="start-card" onClick={() => setIsUploadOpen(true)}>
          <UploadCloud size={22} />
          <span>
            <strong>Upload video</strong>
            <small>Local MP4, MOV, WEBM</small>
          </span>
        </button>
        <button className="start-card" onClick={() => setIsUploadOpen(true)}>
          <Link2 size={22} />
          <span>
            <strong>Paste video link</strong>
            <small>YouTube, Vimeo, direct URL</small>
          </span>
        </button>
        <Link className="start-card clips-link" href="/dashboard/clips">
          <FileVideo size={22} />
          <span>
            <strong>{counts.clips} generated clips</strong>
            <small>Open the clip review space</small>
          </span>
        </Link>
      </section>

      <section className="metrics-row">
        <div><span>Active</span><strong>{counts.active}</strong></div>
        <div><span>Ready</span><strong>{counts.ready}</strong></div>
        <div><span>Issues</span><strong>{counts.issues}</strong></div>
        <div><span>Total projects</span><strong>{jobs.length}</strong></div>
      </section>

      <section className="project-panel">
        <div className="panel-top">
          <div>
            <h2>Project queue</h2>
            <p>One row per source video. Error details stay collapsed so the queue stays readable.</p>
          </div>
          <div className="toolbar">
            <div className="search-box">
              <Search size={15} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects..." />
            </div>
            <div className="tabs">
              {[
                ["all", "All"],
                ["active", "Active"],
                ["complete", "Ready"],
                ["error", "Issues"],
              ].map(([value, label]) => (
                <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value as typeof filter)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="project-table">
          <div className="table-head">
            <span>Source</span>
            <span>Status</span>
            <span>Clips</span>
            <span>Progress</span>
            <span></span>
          </div>

          {isLoading && jobs.length === 0 && (
            <div className="empty-state">
              <Loader2 className="spin" size={18} />
              Loading projects...
            </div>
          )}

          {!isLoading && visibleJobs.length === 0 && (
            <div className="empty-state">
              <FileVideo size={18} />
              No projects match this view.
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
                    <small>ID: {job.id}</small>
                    {job.status === "error" && job.message && <details><summary>View issue</summary>{job.message}</details>}
                  </div>
                </div>
                <span className={`status-pill ${job.status}`}>{statusLabel(job.status)}</span>
                <span className="clip-count">{job.clips?.length || 0}</span>
                <div className="progress-cell">
                  <span>{progress}%</span>
                  <div><i style={{ width: `${progress}%` }} /></div>
                </div>
                <div className="row-actions">
                  {job.status === "complete" && <Link href="/dashboard/clips">View clips</Link>}
                  <button onClick={() => handleDeleteJob(job.id)} title="Delete project">
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <style jsx>{`
        .clean-dashboard {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .dashboard-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
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

        .dashboard-hero p,
        .panel-top p {
          color: var(--muted);
          margin-top: 8px;
          line-height: 1.6;
        }

        .primary-action,
        .start-card,
        .tabs button,
        .row-actions button,
        .row-actions a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 0;
          cursor: pointer;
          color: inherit;
        }

        .primary-action {
          min-height: 46px;
          border-radius: 12px;
          padding: 0 18px;
          background: #ffffff;
          color: #05060a;
          font-weight: 800;
          white-space: nowrap;
        }

        .start-strip {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .start-card,
        .metrics-row div,
        .project-panel {
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(10, 13, 22, 0.78);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 18px 60px rgba(0, 0, 0, 0.22);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .start-card {
          min-height: 96px;
          border-radius: 18px;
          padding: 20px;
          justify-content: flex-start;
          text-align: left;
          transition: transform 0.18s ease, border-color 0.18s ease;
        }

        .start-card:hover {
          transform: translateY(-2px);
          border-color: rgba(6, 182, 212, 0.32);
        }

        .start-card svg {
          color: var(--accent-2);
          flex: 0 0 auto;
        }

        .start-card span {
          display: grid;
          gap: 4px;
        }

        .start-card strong {
          font-family: var(--font-outfit);
          font-size: 17px;
        }

        .start-card small,
        .table-head,
        .source-cell small,
        details {
          color: var(--muted);
        }

        .clips-link {
          text-decoration: none;
        }

        .metrics-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .metrics-row div {
          border-radius: 16px;
          padding: 18px;
          display: grid;
          gap: 8px;
        }

        .metrics-row span {
          color: var(--muted);
          font-size: 12px;
          font-weight: 750;
        }

        .metrics-row strong {
          font-family: var(--font-outfit);
          font-size: 30px;
          line-height: 1;
        }

        .project-panel {
          border-radius: 20px;
          overflow: hidden;
        }

        .panel-top {
          padding: 22px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: grid;
          gap: 18px;
        }

        .panel-top h2 {
          font-size: 24px;
        }

        .toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .search-box {
          flex: 1;
          min-height: 44px;
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

        .tabs {
          display: flex;
          gap: 4px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 4px;
          background: rgba(255, 255, 255, 0.045);
        }

        .tabs button {
          min-height: 34px;
          border-radius: 9px;
          padding: 0 11px;
          background: transparent;
          color: var(--muted);
          font-size: 13px;
          font-weight: 750;
        }

        .tabs button.active {
          background: rgba(255, 255, 255, 0.11);
          color: #ffffff;
        }

        .project-table {
          display: grid;
        }

        .table-head,
        .project-row {
          display: grid;
          grid-template-columns: minmax(260px, 1fr) 120px 80px 160px 130px;
          gap: 14px;
          align-items: center;
        }

        .table-head {
          padding: 12px 18px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: rgba(255, 255, 255, 0.035);
        }

        .project-row {
          min-height: 76px;
          padding: 14px 18px;
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
          width: 38px;
          height: 38px;
          border-radius: 12px;
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
          max-width: 520px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 14px;
        }

        .source-cell small {
          font-size: 12px;
        }

        details {
          margin-top: 5px;
          max-width: 560px;
          font-size: 12px;
          line-height: 1.45;
        }

        details summary {
          color: #fca5a5;
          cursor: pointer;
          width: fit-content;
        }

        .status-pill {
          width: fit-content;
          border-radius: 999px;
          padding: 5px 9px;
          font-size: 12px;
          font-weight: 800;
          background: rgba(255, 255, 255, 0.06);
          color: var(--muted-strong);
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

        .clip-count {
          color: var(--muted-strong);
          font-weight: 800;
        }

        .progress-cell {
          display: grid;
          gap: 6px;
          color: var(--muted);
          font-size: 12px;
          font-weight: 750;
        }

        .progress-cell div {
          height: 7px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.08);
        }

        .progress-cell i {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #06b6d4, #7c3aed);
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
        }

        .row-actions button {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.045);
          color: var(--muted);
        }

        .row-actions button:hover {
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.1);
        }

        .empty-state {
          min-height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: var(--muted);
        }

        .spin {
          animation: spin 1.1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1180px) {
          .table-head {
            display: none;
          }

          .project-row {
            grid-template-columns: 1fr;
            align-items: stretch;
          }

          .row-actions {
            justify-content: flex-start;
          }
        }

        @media (max-width: 820px) {
          .dashboard-hero,
          .toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .primary-action {
            width: 100%;
          }

          .start-strip,
          .metrics-row {
            grid-template-columns: 1fr;
          }

          .tabs {
            overflow-x: auto;
          }
        }
      `}</style>
    </div>
  );
}
