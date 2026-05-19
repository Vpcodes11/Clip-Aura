"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Link as LinkIcon, Sparkles } from 'lucide-react';
import { authenticatedFetch } from '@/lib/supabase';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (activeTab === 'upload' && !file) {
      setError('Please select an intelligence asset to upload.');
      return;
    }
    if (activeTab === 'url' && !url) {
      setError('Please paste a valid YouTube or video link.');
      return;
    }
    
    setError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      if (activeTab === 'upload' && file) {
        formData.append('file', file);
      } else {
        formData.append('url', url);
      }
      
      // Default presets for now
      formData.append('preset', 'tiktok');
      formData.append('caption_style', 'typography_motion');
 
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await authenticatedFetch(`${apiUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      });
 
      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      console.log('Job started:', data.job_id);
      onClose();
      // In a real app, we would redirect to the job status page
    } catch (error) {
      console.error(error);
      alert('Failed to start intelligence pipeline.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTabChange = (tab: 'upload' | 'url') => {
    setActiveTab(tab);
    setError(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" onClick={onClose}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="modal-content glass"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title">
                <Sparkles size={18} className="text-accent" />
                <h2>New Video Project</h2>
              </div>
              <button onClick={onClose} className="close-btn"><X size={20} /></button>
            </div>

            <div className="modal-tabs">
              <button 
                className={`modal-tab ${activeTab === 'upload' ? 'active' : ''}`}
                onClick={() => handleTabChange('upload')}
              >
                <Upload size={16} /> Upload Video
              </button>
              <button 
                className={`modal-tab ${activeTab === 'url' ? 'active' : ''}`}
                onClick={() => handleTabChange('url')}
              >
                <LinkIcon size={16} /> Paste URL
              </button>
            </div>

            <div className="modal-body">
              {activeTab === 'upload' ? (
                <div 
                  className="drop-zone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={(e) => {
                      setFile(e.target.files?.[0] || null);
                      setError(null);
                    }}
                    style={{ display: 'none' }}
                  />
                  {file ? (
                    <div className="file-selected">
                      <div className="logo-box">✓</div>
                      <span>{file.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload size={32} className="text-muted" />
                      <p>Drag intelligence assets or click to browse</p>
                      <span className="text-muted text-xs">Supports MP4, MOV up to 2GB</span>
                    </>
                  )}
                </div>
              ) : (
                <div className="url-input-box">
                  <input 
                    type="text" 
                    placeholder="https://youtube.com/watch?v=..." 
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setError(null);
                    }}
                    className="stealth-input"
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="error-message-tooltip font-semibold text-xs"
                  >
                    ⚠️ {error}
                  </motion.div>
                )}
              </AnimatePresence>
              <button 
                className="glow-button w-full" 
                disabled={isUploading}
                onClick={handleUpload}
              >
                {isUploading ? 'Initializing...' : 'Deploy Pipeline'}
              </button>
            </div>
          </motion.div>

          <style jsx>{`
            .modal-overlay {
              position: fixed;
              top: 0; left: 0; width: 100%; height: 100%;
              background: rgba(0,0,0,0.8);
              backdrop-filter: blur(8px);
              z-index: 1000;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .modal-content {
              width: 100%;
              max-width: 480px;
              max-height: 90vh;
              overflow-y: auto;
              padding: 32px;
              display: flex;
              flex-direction: column;
              gap: 24px;
            }
            .modal-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .modal-title {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .modal-title h2 { font-size: 20px; }
            .close-btn { background: none; border: none; color: var(--muted); cursor: pointer; }
            
            .modal-tabs {
              display: flex;
              background: rgba(255,255,255,0.03);
              border-radius: 8px;
              padding: 4px;
              gap: 4px;
            }
            .modal-tab {
              flex: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              padding: 8px;
              border-radius: 6px;
              font-size: 13px;
              font-weight: 600;
              color: var(--muted);
              background: none;
              border: none;
              cursor: pointer;
              transition: var(--transition);
            }
            .modal-tab.active {
              background: rgba(255,255,255,0.05);
              color: #fff;
              border: 1px solid rgba(255,255,255,0.1);
            }
            
            .drop-zone {
              border: 2px dashed rgba(255,255,255,0.1);
              border-radius: 12px;
              padding: 40px 20px;
              text-align: center;
              cursor: pointer;
              transition: var(--transition);
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 12px;
            }
            .drop-zone:hover {
              border-color: var(--accent);
              background: rgba(139, 92, 246, 0.05);
            }
            .file-selected {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 12px;
            }
            .logo-box {
              width: 40px; height: 40px;
              background: #10b981; border-radius: 50%;
              display: flex; align-items: center; justify-content: center;
              font-weight: 800;
            }
            
            .stealth-input {
              width: 100%;
              background: rgba(255,255,255,0.03);
              border: 1px solid rgba(255,255,255,0.1);
              border-radius: 8px;
              padding: 16px;
              color: #fff;
              font-family: var(--font-inter);
              outline: none;
            }
            .stealth-input:focus { border-color: var(--accent); }
            
            .w-full { width: 100%; }
            .error-message-tooltip {
              background: rgba(239, 68, 68, 0.08);
              border: 1px solid rgba(239, 68, 68, 0.20);
              color: #f87171;
              padding: 10px 14px;
              border-radius: 8px;
              text-align: center;
              width: 100%;
              margin-bottom: 12px;
              box-shadow: 0 4px 12px rgba(239, 68, 68, 0.08);
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  );
}
