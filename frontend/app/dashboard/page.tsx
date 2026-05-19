"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Share2, 
  ExternalLink,
  Sparkles,
  Loader2,
  Trash2,
  AlertTriangle,
  Film,
  TrendingUp,
  Layers
} from "lucide-react";
import UploadModal from "@/components/UploadModal";
import EditorModal from "@/components/EditorModal";
import { authenticatedFetch } from "@/lib/supabase";

interface Clip {
  filename: string;
  title: string;
  score: number;
  duration?: string;
}

interface Job {
  id: string;
  status: string;
  progress?: number;
  message?: string;
  source?: string;
  clips?: Clip[];
}

export default function Dashboard() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeEditorClip, setActiveEditorClip] = useState<{ jobId: string; clip: any; clipIndex: number } | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  
  React.useEffect(() => {
    const fetchJobs = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await authenticatedFetch(`${apiUrl}/api/jobs`);
        if (res.ok) {
          const data = await res.json();
          setJobs(data);
          
          const activeCount = data.filter((job: Job) => 
            ['queued', 'downloading', 'processing'].includes(job.status)
          ).length;
          setActiveJobsCount(activeCount);
        }
      } catch (err) {
        console.error("Failed to fetch intelligence projects:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
    
    // Adaptive Polling: 3s if active jobs are running, 12s otherwise
    const intervalTime = activeJobsCount > 0 ? 3000 : 12000;
    const interval = setInterval(fetchJobs, intervalTime);
    return () => clearInterval(interval);
  }, [activeJobsCount]);

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this project and all its clips?")) {
      return;
    }
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await authenticatedFetch(`${apiUrl}/api/job/${jobId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setJobs(prev => prev.filter(j => j.id !== jobId));
      }
    } catch (err) {
      console.error("Failed to delete job:", err);
    }
  };

  const activeJobs = jobs.filter(job => ['queued', 'downloading', 'processing'].includes(job.status));
  const errorJobs = jobs.filter(job => job.status === 'error');
  const completedJobs = jobs.filter(job => job.status === 'complete');

  return (
    <div className="dashboard-content">
      <header className="page-header">
        <div>
          <h1>My Workspace</h1>
          <p className="text-muted">Manage and deploy your viral video clips.</p>
        </div>
        <button className="glow-button" onClick={() => setIsUploadOpen(true)}>
          <Plus size={18} /> New Project
        </button>
      </header>

      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
      <EditorModal 
        isOpen={activeEditorClip !== null} 
        onClose={() => setActiveEditorClip(null)} 
        jobId={activeEditorClip?.jobId || ''} 
        clip={activeEditorClip?.clip || null} 
        clipIndex={activeEditorClip?.clipIndex ?? 0}
        onSaveSuccess={async () => {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
          const res = await authenticatedFetch(`${apiUrl}/api/jobs`);
          if (res.ok) {
            const data = await res.json();
            setJobs(data);
          }
        }}
      />

      {/* Stats / Overview Bento */}
      <section className="stats-grid">
        <div className="stat-card glass">
          <div className="stat-icon-wrapper">
            <Film size={20} className="text-accent" />
          </div>
          <div className="stat-details">
            <span className="stat-label">TOTAL VIRAL CLIPS</span>
            <div className="stat-value">
              {completedJobs.reduce((acc, job) => acc + (job.clips?.length || 0), 0)}
            </div>
          </div>
          <div className="stat-glowing-glow" />
        </div>
        
        <div className="stat-card glass">
          <div className="stat-icon-wrapper active">
            <TrendingUp size={20} className="text-accent" />
          </div>
          <div className="stat-details">
            <span className="stat-label">ACTIVE RENDERERS</span>
            <div className="stat-value text-accent">{activeJobs.length}</div>
          </div>
          <div className="stat-glowing-glow active" />
        </div>

        <div className="stat-card glass">
          <div className="stat-icon-wrapper">
            <Layers size={20} className="text-accent" />
          </div>
          <div className="stat-details">
            <span className="stat-label">COMPLETED CAMPAIGNS</span>
            <div className="stat-value">{completedJobs.length}</div>
          </div>
          <div className="stat-glowing-glow" />
        </div>
      </section>

      {/* Active & Failed Pipelines Section */}
      {(activeJobs.length > 0 || errorJobs.length > 0) && (
        <section className="active-pipelines-section">
          <h2>Active Processing Pipelines</h2>
          <div className="pipelines-grid">
            {activeJobs.map(job => (
              <div key={job.id} className="pipeline-card glass">
                <div className="pipeline-header">
                  <div className="pipeline-title-group">
                    <div className="pipeline-icon-container spinner-container">
                      <Loader2 className="spinner-icon animate-spin" size={20} />
                    </div>
                    <div>
                      <h3>{job.source || `Project ${job.id}`}</h3>
                      <p className="pipeline-id">ID: {job.id}</p>
                    </div>
                  </div>
                  <span className={`status-badge ${job.status}`}>
                    {job.status}
                  </span>
                </div>
                
                <div className="pipeline-progress-container">
                  <div className="progress-bar-bg">
                    <motion.div 
                      className="progress-bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${job.progress || 0}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="progress-details">
                    <span className="progress-message">{job.message || "Initializing..."}</span>
                    <span className="progress-percent">{job.progress || 0}%</span>
                  </div>
                </div>
              </div>
            ))}

            {errorJobs.map(job => (
              <div key={job.id} className="pipeline-card glass error-card">
                <div className="pipeline-header">
                  <div className="pipeline-title-group">
                    <div className="pipeline-icon-container error-icon-container">
                      <AlertTriangle className="error-icon" size={20} />
                    </div>
                    <div>
                      <h3>{job.source || `Project ${job.id}`}</h3>
                      <p className="pipeline-id">ID: {job.id}</p>
                    </div>
                  </div>
                  <div className="error-actions">
                    <button 
                      onClick={() => handleDeleteJob(job.id)} 
                      className="delete-pipeline-btn" 
                      title="Clear failed project"
                    >
                      <Trash2 size={16} />
                    </button>
                    <span className="status-badge error">Failed</span>
                  </div>
                </div>
                <div className="error-msg-container">
                  <p className="error-message">{job.message || "An unexpected error occurred during clipping."}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Clip Library */}
      <section className="library-section">
        <div className="library-header">
          <div className="search-bar glass">
            <Search size={16} className="text-muted" />
            <input type="text" placeholder="Search your clips..." />
          </div>
          <div className="filter-group">
            <button className="filter-btn glass"><Filter size={16} /> Filter</button>
          </div>
        </div>

        <div className="clips-masonry">
          {jobs.length === 0 && !isLoading && (
            <div className="empty-state glass">
              <Sparkles size={48} className="text-muted" />
              <h3>No clips found</h3>
              <p>Deploy your first video pipeline to see results here.</p>
            </div>
          )}
          
          {jobs.flatMap(job => (job.clips || []).map((clip: Clip, idx: number) => {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            return (
              <motion.div 
                key={clip.filename}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="clip-bento glass"
              >
                <div className="clip-thumb">
                  <div className="video-wrap">
                    <video 
                      src={`${apiUrl}/api/preview/${job.id}/${clip.filename}`} 
                      className="w-full h-full object-cover"
                      muted
                      onMouseOver={(e) => e.currentTarget.play()}
                      onMouseOut={(e) => e.currentTarget.pause()}
                    />
                  </div>
                  <div className="clip-duration">{clip.duration || "0:30"}</div>
                </div>
                <div className="clip-meta">
                  <div className="clip-top">
                    <span className="viral-badge">SCORE: {clip.score}</span>
                    <span className="status-tag ready">Ready</span>
                  </div>
                  <h3>{clip.title}</h3>
                  <div className="clip-actions">
                    <button onClick={() => window.open(`${apiUrl}/api/download/${job.id}/${clip.filename}`)} title="Download"><Download size={16} /></button>
                    <button title="Share"><Share2 size={16} /></button>
                    <button onClick={() => setActiveEditorClip({ jobId: job.id, clip, clipIndex: idx })} title="Open Editor"><ExternalLink size={16} /></button>
                    <button onClick={() => handleDeleteJob(job.id)} title="Delete Project" className="hover-danger"><Trash2 size={16} /></button>
                  </div>
                </div>
              </motion.div>
            );
          }))}
        </div>
      </section>

      <style jsx>{`
        .empty-state {
          grid-column: 1 / -1;
          padding: 80px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .dashboard-content {
          display: flex;
          flex-direction: column;
          gap: 40px;
        }
        
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        
        .page-header h1 {
          font-size: 32px;
          margin-bottom: 4px;
        }

        /* Active Pipelines Section */
        .active-pipelines-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .active-pipelines-section h2 {
          font-size: 20px;
          font-weight: 700;
        }
        .pipelines-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 20px;
        }
        .pipeline-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
          overflow: hidden;
        }
        .pipeline-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          height: 3px;
          width: 100%;
          background: linear-gradient(90deg, var(--accent), #d946ef);
        }
        .pipeline-card.error-card::before {
          background: linear-gradient(90deg, #ef4444, #f97316);
        }
        .pipeline-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .pipeline-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pipeline-icon-container {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .spinner-icon {
          color: var(--accent);
        }
        .animate-spin {
          animation: spin 1.5s linear infinite;
        }
        .error-icon {
          color: #ef4444;
        }
        .pipeline-title-group h3 {
          font-size: 14px;
          font-weight: 600;
          max-width: 200px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pipeline-id {
          font-size: 11px;
          color: var(--muted);
        }
        .status-badge {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .status-badge.queued {
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.1);
        }
        .status-badge.downloading {
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
        }
        .status-badge.processing {
          color: var(--accent);
          background: rgba(139, 92, 246, 0.1);
        }
        .status-badge.error {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }
        .pipeline-progress-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .progress-bar-bg {
          height: 6px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent), #d946ef);
          border-radius: 10px;
        }
        .progress-details {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }
        .progress-message {
          color: var(--muted);
          font-weight: 500;
        }
        .progress-percent {
          font-weight: 700;
          color: #fff;
        }
        .error-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .delete-pipeline-btn {
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          transition: var(--transition);
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .delete-pipeline-btn:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.05);
        }
        .error-msg-container {
          background: rgba(239, 68, 68, 0.03);
          border: 1px solid rgba(239, 68, 68, 0.1);
          border-radius: 8px;
          padding: 10px 12px;
          width: 100%;
        }
        .error-message {
          font-size: 12px;
          color: #f87171;
          line-height: 1.4;
        }
        
        .hover-danger:hover {
          color: #ef4444 !important;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        
        .stat-card {
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          position: relative;
          overflow: hidden;
          transition: var(--transition);
        }

        .stat-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.15);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3), 0 0 20px rgba(139, 92, 246, 0.05);
        }
        
        .stat-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.02);
          transition: var(--transition);
        }

        .stat-icon-wrapper.active {
          background: rgba(139, 92, 246, 0.08);
          border-color: rgba(139, 92, 246, 0.2);
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.1);
        }

        .stat-icon-wrapper.active :global(svg) {
          animation: pulse-glow 2s infinite ease-in-out;
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }

        .stat-card:hover .stat-icon-wrapper {
          border-color: var(--accent);
          color: #fff;
        }

        .stat-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
          z-index: 2;
        }
        
        .stat-label {
          font-size: 10px;
          font-weight: 800;
          color: var(--muted);
          letter-spacing: 0.1em;
        }
        
        .stat-value {
          font-size: 32px;
          font-weight: 800;
          font-family: var(--font-outfit);
          line-height: 1;
        }

        .stat-glowing-glow {
          position: absolute;
          top: -50px;
          right: -50px;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0) 70%);
          filter: blur(10px);
          transition: var(--transition);
          z-index: 1;
          pointer-events: none;
        }

        .stat-card:hover .stat-glowing-glow {
          background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0) 70%);
          transform: scale(1.2);
        }

        /* Library */
        .library-section {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .library-header {
          display: flex;
          justify-content: space-between;
          gap: 20px;
        }
        
        .search-bar {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 20px;
          height: 48px;
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .search-bar:hover {
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.12);
        }
        .search-bar:focus-within {
          border-color: rgba(139, 92, 246, 0.5);
          background: rgba(255, 255, 255, 0.02);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15), inset 0 2px 4px rgba(0, 0, 0, 0.2);
          transform: translateY(-1px);
        }
        .search-bar input {
          background: none;
          border: none;
          color: #fff;
          width: 100%;
          outline: none;
          font-size: 14px;
          font-family: var(--font-inter), sans-serif;
        }
        
        .filter-btn {
          height: 48px;
          padding: 0 24px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .filter-btn:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        .filter-btn:active {
          transform: translateY(0px);
        }

        /* Clips Grid */
        .clips-masonry {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
        }
        
        .clip-bento {
          overflow: hidden;
          transition: var(--transition);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        
        .clip-bento:hover {
          transform: translateY(-4px);
          border-color: var(--accent);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35), 0 0 20px rgba(139, 92, 246, 0.1);
        }
        
        .clip-thumb {
          aspect-ratio: 9/16;
          background: #0d0d0e;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .video-wrap {
          width: 100%;
          height: 100%;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .clip-bento:hover .video-wrap {
          transform: scale(1.05);
        }
        
        .clip-play {
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(8px);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: var(--transition);
        }
        
        .clip-bento:hover .clip-play {
          opacity: 1;
        }
        
        .clip-duration {
          position: absolute;
          bottom: 12px;
          right: 12px;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
          font-family: var(--font-mono);
        }
        
        .processing-overlay {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.8);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        
        .clip-meta {
          padding: 20px;
          background: linear-gradient(180deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0) 100%);
        }
        
        .clip-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .viral-badge {
          font-size: 10px;
          font-weight: 800;
          color: #ffeb3b;
          background: rgba(255, 235, 59, 0.06);
          border: 1px solid rgba(255, 235, 59, 0.15);
          padding: 3px 8px;
          border-radius: 6px;
          letter-spacing: 0.05em;
          box-shadow: 0 0 10px rgba(255, 235, 59, 0.02);
        }
        
        .status-tag {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .status-tag.ready { 
          color: #10b981;
          background: rgba(16, 185, 129, 0.06);
          border: 1px solid rgba(16, 185, 129, 0.15);
          padding: 2px 8px;
          border-radius: 6px;
        }
        .status-tag.processing { color: var(--accent); }
        
        .clip-meta h3 {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 16px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #fff;
        }
        
        .clip-actions {
          display: flex;
          gap: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 16px;
          justify-content: space-between;
        }
        
        .clip-actions button {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: var(--muted);
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition);
        }
        
        .clip-actions button:hover {
          color: #fff;
          background: rgba(139, 92, 246, 0.08);
          border-color: var(--accent);
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.15);
        }

        .clip-actions button.hover-danger:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.08);
          border-color: rgba(239, 68, 68, 0.2);
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.15);
        }

        .spinner {
          width: 24px;
          height: 24px;
          border: 2px solid rgba(255,255,255,0.1);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

