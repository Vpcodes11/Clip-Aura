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
  Sparkles 
} from "lucide-react";
import UploadModal from "@/components/UploadModal";
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
  clips?: Clip[];
}

export default function Dashboard() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  React.useEffect(() => {
    const fetchJobs = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await authenticatedFetch(`${apiUrl}/api/jobs`);
        if (res.ok) {
          const data = await res.json();
          setJobs(data);
        }
      } catch (err) {
        console.error("Failed to fetch intelligence projects:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
    const interval = setInterval(fetchJobs, 10000); // Polling for now
    return () => clearInterval(interval);
  }, []);

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

      {/* Stats / Overview Bento */}
      <section className="stats-grid">
        <div className="stat-card glass">
          <span className="stat-label">TOTAL CLIPS</span>
          <div className="stat-value">1,284</div>
        </div>
        <div className="stat-card glass">
          <span className="stat-label">VIRAL SCORE</span>
          <div className="stat-value text-accent">84%</div>
        </div>
        <div className="stat-card glass">
          <span className="stat-label">TIME SAVED</span>
          <div className="stat-value">42 Hrs</div>
        </div>
      </section>

      {/* Clip Library */}
      <section className="library-section">
        <div className="library-header">
          <div className="search-bar glass">
            <Search size={16} className="text-muted" />
            <input type="text" placeholder="Search your clips..." aria-label="Search clips" />
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
                  <video 
                    src={`${apiUrl}/api/preview/${job.id}/${clip.filename}`} 
                    className="w-full h-full object-cover"
                    muted
                    onMouseOver={(e) => e.currentTarget.play()}
                    onMouseOut={(e) => e.currentTarget.pause()}
                  />
                  <div className="clip-duration">{clip.duration || "0:30"}</div>
                </div>
                <div className="clip-meta">
                  <div className="clip-top">
                    <span className="viral-badge">SCORE: {clip.score}</span>
                    <span className="status-tag ready">Ready</span>
                  </div>
                  <h3>{clip.title}</h3>
                  <div className="clip-actions">
                    <button onClick={() => window.open(`${apiUrl}/api/download/${job.id}/${clip.filename}`)} title="Download" aria-label="Download clip"><Download size={16} /></button>
                    <button title="Share" aria-label="Share clip"><Share2 size={16} /></button>
                    <button title="Open Editor" aria-label="Open clip editor"><ExternalLink size={16} /></button>
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

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        
        .stat-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .stat-label {
          font-size: 10px;
          font-weight: 800;
          color: var(--muted);
          letter-spacing: 0.1em;
        }
        
        .stat-value {
          font-size: 28px;
          font-weight: 800;
          font-family: var(--font-outfit);
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
          padding: 0 16px;
          height: 48px;
        }
        
        .search-bar input {
          background: none;
          border: none;
          color: #fff;
          width: 100%;
          outline: none;
          font-size: 14px;
        }
        
        .filter-btn {
          height: 48px;
          padding: 0 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
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
        }
        
        .clip-bento:hover {
          transform: translateY(-4px);
          border-color: rgba(255, 255, 255, 0.2);
        }
        
        .clip-thumb {
          aspect-ratio: 9/16;
          background: #111;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
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
          background: rgba(0,0,0,0.6);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
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
        }
        
        .clip-top {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        
        .viral-badge {
          font-size: 10px;
          font-weight: 800;
          color: #FFD700;
          background: rgba(255, 215, 0, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
        }
        
        .status-tag {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }
        
        .status-tag.ready { color: #10b981; }
        .status-tag.processing { color: var(--accent); }
        
        .clip-meta h3 {
          font-size: 16px;
          margin-bottom: 16px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .clip-actions {
          display: flex;
          gap: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 16px;
        }
        
        .clip-actions button {
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          transition: var(--transition);
        }
        
        .clip-actions button:hover {
          color: #fff;
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
