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
  ChevronDown,
  ChevronUp,
  Terminal,
} from "lucide-react";
import UploadModal from "@/components/UploadModal";
import { authenticatedFetch, supabase } from "@/lib/supabase";
import type { Clip } from "@/components/EditorModal";

interface Job {
  id: string;
  status: string;
  progress?: number;
  message?: string;
  source?: string;
  clips?: Clip[];
  stage?: string;
}

const activeStatuses = ["queued", "downloading", "processing"];

function projectName(job: Job) {
  if (!job.source) return `Project ${job.id}`;
  try {
    const url = new URL(job.source);
    const host = url.hostname.replace(/^www\./, "");
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      const videoId = url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop() || "";
      return videoId ? `YouTube / ${videoId}` : "YouTube video";
    }
    const path = url.pathname.replace(/\/$/, "").split("/").pop() || "";
    return path ? `${host} / ${decodeURIComponent(path)}` : host;
  } catch {
    return job.source.length > 50 ? job.source.slice(0, 47) + "..." : job.source;
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

function ProjectSkeletonRows() {
  return (
    <div className="skeleton-stack" aria-label="Loading projects">
      {[0, 1, 2].map((item) => (
        <div className="project-skeleton" key={item}>
          <span className="skeleton-dot shimmer" />
          <div className="skeleton-copy">
            <span className="skeleton-line shimmer wide" />
            <span className="skeleton-line shimmer short" />
          </div>
          <span className="skeleton-pill shimmer" />
        </div>
      ))}
    </div>
  );
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

  React.useEffect(() => {
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

  return (
    <div className="clean-dashboard">
      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} onUploadStarted={fetchJobs} />

      <section className="dashboard-hero">
        <div>
          <h1>Projects</h1>
          <p>Generate shorts from your videos with AI.</p>
        </div>
        <button className="primary-action" onClick={() => setIsUploadOpen(true)}>
          <Plus size={18} />
          Generate Shorts
        </button>
      </section>
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
            {isLoading && jobs.length === 0 && <ProjectSkeletonRows />}

            {!isLoading && visibleJobs.length === 0 && (
              <div className="empty-state">
                No projects match your search.
              </div>
            )}

            {visibleJobs.map((job) => (
              <ProjectRow
                key={job.id}
                job={job}
                onDelete={handleDeleteJob}
                deletingJobId={deletingJobId}
                onJobStateChange={fetchJobs}
              />
            ))}
          </div>
        </section>

      <style jsx>{`
        .clean-dashboard {
          display: flex;
          flex-direction: column;
          gap: clamp(20px, 3vw, 28px);
        }

        .dashboard-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          animation: fadeSlide 0.32s ease both;
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
          touch-action: manipulation;
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
          animation: fadeSlide 0.32s ease both;
        }

        .panel-top {
          padding: 28px 28px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .panel-top h2 {
          font-size: 16px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--muted-strong);
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
          animation: statusPulse 2s ease-in-out infinite;
        }

        @keyframes statusPulse {
          0%, 100% {
            opacity: 0.82;
            box-shadow: 0 0 0 rgba(6, 182, 212, 0);
          }
          50% {
            opacity: 1;
            box-shadow: 0 0 14px rgba(6, 182, 212, 0.18);
          }
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
          grid-template-columns: minmax(280px, 1fr) 100px 90px auto;
          gap: 20px;
          align-items: center;
          min-height: 88px;
          padding: 20px 28px;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          transition: background 0.18s ease;
        }

        .project-row:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .source-cell {
          display: flex;
          align-items: center;
          gap: 14px;
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
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 4px;
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

        .status-cell {
          display: flex;
          justify-content: center;
        }

        .clips-cell {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .status-pill {
          border-radius: 999px;
          padding: 5px 10px;
          font-size: 12px;
          font-weight: 650;
          background: rgba(255, 255, 255, 0.05);
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
          font-weight: 550;
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
          gap: 10px;
        }

        .row-actions a {
          min-height: 36px;
          border-radius: 9px;
          padding: 0 14px;
          background: rgba(255, 255, 255, 0.08);
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
          color: inherit;
          display: inline-flex;
          align-items: center;
        }

        .row-actions button {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.045);
          color: var(--muted);
          border: 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          touch-action: manipulation;
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

        .skeleton-stack {
          display: grid;
        }

        .project-skeleton {
          display: grid;
          grid-template-columns: 36px minmax(0, 1fr) 92px;
          gap: 14px;
          align-items: center;
          min-height: 88px;
          padding: 20px 28px;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
        }

        .skeleton-dot {
          width: 36px;
          height: 36px;
          border-radius: 10px;
        }

        .skeleton-copy {
          display: grid;
          gap: 8px;
        }

        .skeleton-line,
        .skeleton-pill {
          display: block;
          height: 12px;
          border-radius: 999px;
        }

        .skeleton-line.wide {
          width: min(100%, 360px);
        }

        .skeleton-line.short {
          width: 120px;
          opacity: 0.72;
        }

        .skeleton-pill {
          width: 92px;
          height: 26px;
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
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            padding: 20px;
          }

          .source-cell {
            grid-column: 1 / -1;
          }

          .status-cell {
            justify-content: flex-start;
          }

          .clips-cell {
            justify-content: flex-start;
          }

          .row-actions {
            grid-column: 1 / -1;
            justify-content: stretch;
          }

          .row-actions a {
            flex: 1;
            justify-content: center;
            min-height: 40px;
          }

          .row-actions button {
            width: 42px;
            height: 40px;
          }

          .project-skeleton {
            grid-template-columns: 36px minmax(0, 1fr);
            padding: 20px;
          }

          .skeleton-pill {
            grid-column: 1 / -1;
            width: 140px;
          }

          .empty-guide {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .clean-dashboard {
            gap: 18px;
          }

          .dashboard-hero {
            flex-direction: column;
            align-items: stretch;
            gap: 14px;
          }

          .primary-action {
            width: 100%;
            justify-content: center;
          }

          .panel-top {
            flex-direction: column;
            align-items: stretch;
            padding: 22px;
          }

          .panel-top h2 {
            flex-wrap: wrap;
            line-height: 1.35;
          }

          .search-box {
            max-width: 100%;
            min-height: 44px;
          }

          .empty-guide-card {
            min-height: 150px;
            padding: 24px;
          }

          .source-cell {
            align-items: flex-start;
          }

          .source-cell h3 {
            white-space: normal;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }

          .status-cell,
          .clips-cell {
            justify-content: flex-start;
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

interface ProjectRowProps {
  job: Job;
  onDelete: (id: string) => void;
  deletingJobId: string | null;
  onJobStateChange: () => void;
}

function ProjectRow({ job, onDelete, deletingJobId, onJobStateChange }: ProjectRowProps) {
  const [localJob, setLocalJob] = useState<Job>(job);
  const [logs, setLogs] = useState<string[]>([job.message || "Initializing..."]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Sync prop changes (e.g. if parent polls and finds job status changed)
  React.useEffect(() => {
    queueMicrotask(() => {
      setLocalJob(job);
      if (!job.message) return;
      setLogs((prev) => {
        if (prev[prev.length - 1] === job.message) return prev;
        return [...prev, job.message!];
      });
    });
  }, [job]);

  // Connect WebSocket for active jobs
  React.useEffect(() => {
    if (!activeStatuses.includes(localJob.status)) return;

    let socket: WebSocket | null = null;
    let isMounted = true;

    const connectWs = async () => {
      try {
        const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE !== 'false';
        let token = 'dev-token';
        if (!isDevMode) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            token = session.access_token;
          }
        }

        if (!isMounted) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const wsProtocol = apiUrl.startsWith("https") ? "wss" : "ws";
        const wsUrl = `${apiUrl.replace(/^http/, wsProtocol)}/ws/${localJob.id}?token=${token}`;
        
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          if (isMounted) setWsConnected(true);
        };

        socket.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'progress') {
              setLocalJob((prev) => ({
                ...prev,
                progress: data.progress,
                message: data.message,
                status: 'processing',
              }));
              if (data.message) {
                setLogs((prev) => {
                  if (prev[prev.length - 1] === data.message) return prev;
                  return [...prev, data.message];
                });
              }
            } else if (data.type === 'complete') {
              setLocalJob((prev) => ({
                ...prev,
                status: 'complete',
                progress: 100,
                message: data.message,
                clips: data.clips || [],
              }));
              if (data.message) {
                setLogs((prev) => [...prev, data.message]);
              }
              onJobStateChange();
            } else if (data.type === 'error') {
              setLocalJob((prev) => ({
                ...prev,
                status: 'error',
                message: data.message,
                progress: 0,
              }));
              if (data.message) {
                setLogs((prev) => [...prev, `[ERROR]: ${data.message}`]);
              }
              onJobStateChange();
            }
          } catch (e) {
            console.error("Error parsing websocket message", e);
          }
        };

        socket.onerror = (err) => {
          if (isMounted) setWsConnected(false);
          console.error("WebSocket error for job", localJob.id, err);
        };

        socket.onclose = () => {
          if (isMounted) setWsConnected(false);
          console.log("WebSocket closed for job", localJob.id);
        };

      } catch (err) {
        console.error("Failed to connect websocket", err);
      }
    };

    connectWs();

    return () => {
      isMounted = false;
      if (socket) {
        socket.close();
      }
    };
  }, [localJob.id, localJob.status]);

  // Scroll logs to bottom
  React.useEffect(() => {
    if (isExpanded && showLogs && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isExpanded, showLogs]);

  const progress = Math.max(0, Math.min(100, localJob.progress || (localJob.status === "complete" ? 100 : 0)));

  // Calculate step statuses
  const steps = useMemo(() => {
    const defaultSteps = [
      { id: 1, name: "Importing Media", desc: "Preparing high-res source video..." },
      { id: 2, name: "AI Caption Ingestion", desc: "Listening and mapping text..." },
      { id: 3, name: "Hook Analysis", desc: "Locating highest-retention segments..." },
      { id: 4, name: "Smart Reframing", desc: "Framing speakers & adjusting layouts..." },
      { id: 5, name: "Polishing Short", desc: "Applying dynamic styling & rendering..." },
    ];

    const status = localJob.status;
    const stage = localJob.stage || 'queued';

    let activeIndex = -1;
    if (status === 'complete') {
      activeIndex = 5;
    } else if (status === 'error') {
      if (stage === 'downloading' || stage === 'download') activeIndex = 0;
      else if (stage === 'queued' || stage === 'preflighted' || stage === 'transcribed') activeIndex = 1;
      else if (stage === 'analyzed') activeIndex = 2;
      else if (stage === 'aligned') activeIndex = 3;
      else if (stage === 'clips_rendering' || stage === 'clips_rendered') activeIndex = 4;
      else activeIndex = 0;
    } else {
      if (stage === 'downloading' || stage === 'download') {
        activeIndex = 0;
      } else if (stage === 'queued' || stage === 'preflighted') {
        activeIndex = 1;
      } else if (stage === 'transcribed') {
        activeIndex = 2;
      } else if (stage === 'analyzed') {
        activeIndex = 2;
      } else if (stage === 'aligned') {
        activeIndex = 3;
      } else if (stage === 'clips_rendering' || stage === 'clips_rendered') {
        activeIndex = 4;
      } else {
        activeIndex = 0;
      }
    }

    return defaultSteps.map((step, idx) => {
      let stepStatus: 'todo' | 'active' | 'done' | 'error' = 'todo';
      if (status === 'error' && idx === activeIndex) {
        stepStatus = 'error';
      } else if (idx < activeIndex) {
        stepStatus = 'done';
      } else if (idx === activeIndex) {
        stepStatus = 'active';
      }
      return { ...step, status: stepStatus };
    });
  }, [localJob.status, localJob.stage]);

  const showChevron = activeStatuses.includes(localJob.status) || localJob.status === "error";

  return (
    <div className={`project-row-wrapper ${localJob.status}`}>
      <article className={`project-row ${localJob.status}`}>
        <div className="source-cell">
          <span className="status-icon"><StatusIcon status={localJob.status} /></span>
          <div>
            <h3>{projectName(localJob)}</h3>
            <small>{localJob.id}</small>
            {localJob.status === "error" && localJob.message && !isExpanded && (
              <div className="quick-error-msg">Error: {localJob.message}</div>
            )}
          </div>
        </div>
        <div className="status-cell">
          <span className={`status-pill ${localJob.status}`}>{statusLabel(localJob.status)}</span>
        </div>
        <div className="clips-cell">
          {activeStatuses.includes(localJob.status) ? (
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          ) : (
            <span className="clip-badge">{localJob.clips?.length || 0} clip{(localJob.clips?.length || 0) !== 1 ? "s" : ""}</span>
          )}
        </div>
        <div className="row-actions">
          {localJob.status === "complete" && <Link href={`/dashboard/clips?job=${localJob.id}`}>View clips</Link>}
          {showChevron && (
            <button className="chevron-toggle-btn" onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? "Hide Details" : "Show Details"}>
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
          <button onClick={() => onDelete(localJob.id)} title="Delete project" disabled={deletingJobId === localJob.id}>
            {deletingJobId === localJob.id ? <Loader2 className="spin" size={15} /> : <Trash2 size={15} />}
          </button>
        </div>
      </article>

      {isExpanded && showChevron && (
        <div className="row-expansion-panel">
          <div className={`expansion-grid ${showLogs ? 'with-logs' : 'no-logs'}`}>
            <div className="checklist-section">
              <div className="flex-justify-between flex-items-center mb-4">
                <h4 className="section-title mb-0 flex-items-center">
                  Pipeline Progress
                  {wsConnected && (
                    <span className="live-badge-inline flex-items-center ml-2">
                      <span className="live-dot-pulse mr-1" /> Live Sync Active
                    </span>
                  )}
                </h4>
                <button 
                  className="toggle-logs-btn" 
                  onClick={() => setShowLogs(!showLogs)}
                  type="button"
                >
                  <Terminal size={12} className="mr-1" />
                  {showLogs ? "Hide Console Logs" : "Show Console Logs"}
                </button>
              </div>
              <div className="steps-timeline">
                {steps.map((step, idx) => {
                  return (
                    <div key={step.id} className={`step-item ${step.status}`}>
                      <div className="step-badge-wrapper">
                        <div className={`step-status-badge ${step.status}`}>
                          {step.status === 'done' && <span className="checkmark">✓</span>}
                          {step.status === 'active' && <span className="pulsing-dot" />}
                          {step.status === 'error' && <span className="error-mark">!</span>}
                          {step.status === 'todo' && <span className="todo-dot" />}
                        </div>
                        {idx < steps.length - 1 && (
                          <div className={`step-line-connector ${step.status === 'done' ? 'done' : ''}`} />
                        )}
                      </div>
                      <div className="step-text">
                        <span className="step-name">{step.name}</span>
                        <span className="step-desc">{step.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {activeStatuses.includes(localJob.status) && (
                <div className="countdown-estimate-text">
                  Typically takes ~45 seconds. You can safely close this drawer.
                </div>
              )}
            </div>

            {showLogs && (
              <div className="console-log-section">
                <h4 className="section-title flex-items-center">
                  <Terminal size={14} className="margin-right-6 text-accent" />
                  Live Execution Logs
                </h4>
                <div className="console-box">
                  {logs.map((log, index) => (
                    <div key={index} className="log-line">
                      <span className="log-prompt">&gt;</span> {log}
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .project-row-wrapper {
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          transition: background 0.18s ease;
        }

        .project-row-wrapper:first-of-type {
          border-top: 0;
        }

        .project-row-wrapper:hover {
          background: rgba(255, 255, 255, 0.015);
        }

        .project-row {
          border-top: 0 !important;
        }

        .chevron-toggle-btn {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.045);
          color: var(--muted);
          border: 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .chevron-toggle-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.1);
        }

        .quick-error-msg {
          color: #fca5a5;
          font-size: 12px;
          margin-top: 2px;
        }

        .row-expansion-panel {
          padding: 24px;
          background: rgba(5, 6, 10, 0.4);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          animation: slideDown 0.25s ease-out both;
        }

        .expansion-grid {
          display: grid;
          gap: 32px;
          transition: all 0.3s ease;
        }

        .expansion-grid.with-logs {
          grid-template-columns: 1fr 1.2fr;
        }

        .expansion-grid.no-logs {
          grid-template-columns: 1fr;
        }

        .flex-justify-between {
          display: flex;
          justify-content: space-between;
        }

        .mb-0 {
          margin-bottom: 0 !important;
        }

        .mb-4 {
          margin-bottom: 16px;
        }

        .mr-1 {
          margin-right: 4px;
        }

        .toggle-logs-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--muted-strong);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: all 0.2s ease;
        }

        .toggle-logs-btn:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }

        .section-title {
          font-family: var(--font-outfit);
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 18px;
          letter-spacing: 0;
          display: flex;
          align-items: center;
        }

        .flex-items-center {
          display: flex;
          align-items: center;
        }

        .margin-right-6 {
          margin-right: 6px;
        }

        .text-accent {
          color: #f65c8b;
        }

        .steps-timeline {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .step-item {
          display: flex;
          gap: 16px;
          position: relative;
        }

        .step-badge-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }

        .step-status-badge {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 11px;
          font-weight: 800;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--muted);
          transition: all 0.3s ease;
          z-index: 2;
        }

        .step-status-badge.done {
          background: rgba(16, 185, 129, 0.15);
          border-color: #10b981;
          color: #10b981;
        }

        .step-status-badge.active {
          background: rgba(246, 92, 139, 0.15);
          border-color: #f65c8b;
          color: #f65c8b;
          box-shadow: 0 0 10px rgba(246, 92, 139, 0.4);
        }

        .step-status-badge.error {
          background: rgba(239, 68, 68, 0.15);
          border-color: #ef4444;
          color: #ef4444;
        }

        .checkmark {
          font-weight: bold;
        }

        .pulsing-dot {
          width: 8px;
          height: 8px;
          background-color: #f65c8b;
          border-radius: 50%;
          animation: pulseGlow 1.4s infinite ease-in-out;
        }

        .error-mark {
          font-weight: bold;
        }

        .todo-dot {
          width: 6px;
          height: 6px;
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
        }

        .step-line-connector {
          width: 2px;
          flex-grow: 1;
          min-height: 24px;
          background: rgba(255, 255, 255, 0.08);
          margin: 4px 0;
          transition: background 0.3s ease;
        }

        .step-line-connector.done {
          background: #10b981;
        }

        .step-text {
          display: flex;
          flex-direction: column;
          padding-bottom: 20px;
        }

        .step-name {
          font-family: var(--font-inter);
          font-size: 14px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.6);
          transition: color 0.3s ease;
        }

        .step-desc {
          font-size: 12px;
          color: var(--muted);
          margin-top: 2px;
        }

        .step-item.active .step-name {
          color: #ffffff;
          animation: pulseText 2s infinite ease-in-out;
        }

        .step-item.done .step-name {
          color: rgba(255, 255, 255, 0.85);
        }

        .step-item.error .step-name {
          color: #ef4444;
        }

        .console-box {
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 16px;
          font-family: var(--font-mono, "Courier New", Courier, monospace);
          font-size: 12px;
          line-height: 1.6;
          color: #a78bfa;
          min-height: 180px;
          max-height: 220px;
          overflow-y: auto;
          box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.8);
        }

        .log-line {
          margin-bottom: 4px;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .log-prompt {
          color: #f65c8b;
          font-weight: bold;
          margin-right: 6px;
        }

        @keyframes pulseGlow {
          0% {
            transform: scale(0.8);
            opacity: 0.5;
            box-shadow: 0 0 0 0 rgba(246, 92, 139, 0.7);
          }
          70% {
            transform: scale(1.1);
            opacity: 1;
            box-shadow: 0 0 0 6px rgba(246, 92, 139, 0);
          }
          100% {
            transform: scale(0.8);
            opacity: 0.5;
            box-shadow: 0 0 0 0 rgba(246, 92, 139, 0);
          }
        }

        @keyframes pulseText {
          0% { opacity: 0.85; }
          50% { opacity: 1; text-shadow: 0 0 8px rgba(255, 255, 255, 0.3); }
          100% { opacity: 0.85; }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          .expansion-grid {
            grid-template-columns: 1fr !important;
            gap: 24px;
          }
        }
        .live-dot-pulse {
          width: 6px;
          height: 6px;
          background-color: #10b981;
          border-radius: 50%;
          display: inline-block;
          animation: livePulse 1.5s infinite ease-in-out;
        }
        .mr-1 {
          margin-right: 4px;
        }
        .ml-2 {
          margin-left: 8px;
        }
        @keyframes livePulse {
          0%, 100% { opacity: 0.6; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.2); box-shadow: 0 0 8px #10b981; }
        }
        .live-badge-inline {
          font-family: var(--font-inter);
          font-size: 11px;
          color: #a7f3d0;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 999px;
          padding: 2px 8px;
          display: inline-flex;
          align-items: center;
          font-weight: 600;
          text-transform: none;
          letter-spacing: normal;
        }
        .countdown-estimate-text {
          font-size: 12px;
          color: var(--muted);
          margin-top: 14px;
          padding-left: 40px;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
