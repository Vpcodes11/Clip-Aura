"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Save, RotateCcw, Video, Type, Sliders, Share2, Pencil, Ellipsis } from 'lucide-react';
import { authenticatedFetch } from '@/lib/supabase';

export interface Word {
  word: string;
  start: number;
  end: number;
}

export interface Clip {
  filename: string;
  title: string;
  virality_score: number;
  duration?: string | number;
  hook_caption?: string;
  words?: Word[];
  preview_url?: string;
  render_version?: number;
  start_time: number;
  end_time: number;
}

interface EditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  clip: Clip | null;
  clipIndex: number;
  onSaveSuccess: () => void;
  onExport?: () => void;
}

function getMockWords(clip: Clip): Word[] {
  const mockWords: Word[] = [];
  const splitText = (clip.title || "").split(/\s+/);
  const clipStart = clip.start_time || 0;
  const clipEnd = clip.end_time || 10;
  const duration = clipEnd - clipStart;
  const wordDur = duration / Math.max(1, splitText.length);

  splitText.forEach((word, idx) => {
    if (word.trim()) {
      mockWords.push({
        word: word,
        start: clipStart + idx * wordDur,
        end: clipStart + (idx + 1) * wordDur
      });
    }
  });
  return mockWords;
}

export default function EditorModal({ isOpen, onClose, jobId, clip, clipIndex, onSaveSuccess, onExport }: EditorModalProps) {
  const [words, setWords] = useState<Word[]>(() => {
    if (!clip) return [];
    if (clip.words && clip.words.length > 0) {
      return JSON.parse(JSON.stringify(clip.words));
    }
    return getMockWords(clip);
  });
  const [title, setTitle] = useState(() => clip?.title || '');
  const [hookCaption, setHookCaption] = useState(() => clip?.hook_caption || clip?.title || '');
  const [captionStyle, setCaptionStyle] = useState('typography_motion');
  const [preset, setPreset] = useState('tiktok');
  
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeWordIdx, setActiveWordIdx] = useState<number | null>(null);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editingWordIdx, setEditingWordIdx] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const previewSrc = clip?.preview_url
    ? (clip.preview_url.startsWith('http') ? clip.preview_url : `${apiUrl}${clip.preview_url}`)
    : '';

  // Video synchronization effects
  useEffect(() => {
    if (!clip || !isPlaying) return;
    
    const interval = setInterval(() => {
      if (videoRef.current) {
        const time = videoRef.current.currentTime;
        
        // Find matching word
        const globalTime = clip.start_time + time;
        const matchedIdx = words.findIndex(
          (w) => globalTime >= w.start && globalTime <= w.end
        );
        setActiveWordIdx(matchedIdx !== -1 ? matchedIdx : null);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, words, clip]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleWordClick = (word: Word) => {
    if (videoRef.current && clip) {
      const relativeStart = Math.max(0, word.start - clip.start_time);
      videoRef.current.currentTime = relativeStart;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleWordChange = (idx: number, newText: string) => {
    const updated = [...words];
    updated[idx].word = newText;
    setWords(updated);
  };

  const handleSave = async () => {
    if (!clip) return;
    setIsSaving(true);
    setErrorMessage(null);
    
    try {
      const response = await authenticatedFetch(`${apiUrl}/api/clip/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          filename: clip.filename,
          title: title,
          hook_caption: hookCaption,
          words: words,
          caption_style: captionStyle,
          preset: preset
        })
      });

      if (!response.ok) {
        let message = 'Failed to update clip parameters';
        try {
          const errorBody = await response.json();
          message = errorBody.detail || message;
        } catch {
          // Keep the generic message when the API does not return JSON.
        }
        throw new Error(message);
      }

      // Start polling to wait for the job status to become complete
      let attempts = 0;
      const pollTimer = setInterval(async () => {
        attempts += 1;
        try {
          const statusRes = await authenticatedFetch(`${apiUrl}/api/status/${jobId}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.status === 'complete') {
              clearInterval(pollTimer);
              setIsSaving(false);
              onSaveSuccess();
              onClose();
            } else if (statusData.status === 'error') {
              clearInterval(pollTimer);
              setIsSaving(false);
              setErrorMessage('Render failed. Please try again.');
            }
          }
          if (attempts >= 90) {
            clearInterval(pollTimer);
            setIsSaving(false);
            setErrorMessage('Render is taking longer than expected. Refresh this project before trying again.');
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 2000);

    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to save. Please try again.');
      setIsSaving(false);
    }
  };

  if (!clip) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="editor-overlay" onClick={onClose}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 15 }}
            className="editor-window glass"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Loading Overlay */}
            {isSaving && (
              <div className="loading-overlay">
                <div className="spinner"></div>
                <h3>Saving your changes...</h3>
                <p className="text-muted text-sm">Rendering your clip</p>
              </div>
            )}

            {/* Header */}
            <div className="editor-header">
              <div className="header-title">
                <h2>{clip.title}</h2>
              </div>
              <button onClick={onClose} className="close-btn"><X size={20} /></button>
            </div>

            {errorMessage && (
              <div className="error-banner">
                <span>{errorMessage}</span>
                <button onClick={() => setErrorMessage(null)} className="error-dismiss"><X size={14} /></button>
              </div>
            )}

            {/* Layout */}
            <div className="editor-layout">
              
              {/* Left Column: Player & Subtitle Canvas */}
              <div className="player-column">
                <div 
                  className="video-viewport"
                  style={{
                    aspectRatio: preset === 'landscape' ? '16/9' : '9/16',
                    maxWidth: preset === 'landscape' ? '100%' : '360px',
                    width: '100%',
                    margin: '0 auto',
                    transition: 'aspect-ratio 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  <video 
                    ref={videoRef}
                    key={`${clip.filename}-${clip.render_version || 0}`}
                    src={previewSrc}
                    className="preview-video"
                    onClick={handlePlayPause}
                    onEnded={() => setIsPlaying(false)}
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  />
                  
                  {showAdvanced && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSafeZones(!showSafeZones);
                      }}
                      className={`safe-zone-toggle ${showSafeZones ? 'active' : ''}`}
                      title="Toggle Social Media Safe Zones"
                    >
                      <Sliders size={14} />
                      {showSafeZones ? "Preview" : "Safe Zone"}
                    </button>
                  )}

                  {/* Simulated TikTok Safe Zone Overlay */}
                  {showSafeZones && (
                    <div className="tiktok-safe-overlay">
                      <div className="tok-header">
                        <span>Following</span>
                        <span className="active">For You</span>
                      </div>

                      <div className="tok-actions">
                        <div className="tok-avatar">
                          <div className="avatar-img" />
                          <div className="avatar-plus">+</div>
                        </div>
                        <div className="tok-action-item">
                          <div className="tok-icon-heart" />
                          <span>142.8K</span>
                        </div>
                        <div className="tok-action-item">
                          <div className="tok-icon-comment" />
                          <span>1,248</span>
                        </div>
                        <div className="tok-action-item">
                          <div className="tok-icon-bookmark" />
                          <span>8.4K</span>
                        </div>
                        <div className="tok-action-item">
                          <div className="tok-icon-share" />
                          <span>24.5K</span>
                        </div>
                        <div className="tok-music-disc" />
                      </div>

                      <div className="tok-details">
                        <div className="tok-username">@clipaura.ai</div>
                        <div className="tok-music">
                          <span className="music-icon">♬</span>
                          <span className="music-scroll">Original Sound - clipaura.ai</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Playback Controls */}
                  <div className="viewport-overlay" onClick={handlePlayPause}>
                    {!isPlaying && (
                      <button className="play-button-large">
                        <Play size={24} fill="#fff" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Interactive Audio Waveform Seeker */}
                <div className="audio-waveform-container">
                  <div 
                    className="waveform-visualizer"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                      const duration = (clip.end_time || 10) - (clip.start_time || 0);
                      const targetSeek = ratio * duration;
                      if (videoRef.current) {
                        videoRef.current.currentTime = targetSeek;
                        setCurrentTime(targetSeek);
                      }
                    }}
                  >
                    {Array.from({ length: 40 }).map((_, i) => {
                      const duration = (clip.end_time || 10) - (clip.start_time || 0);
                      const timeAtBar = (clip.start_time || 0) + (i / 40) * duration;
                      const isSpoken = words.some(w => timeAtBar >= w.start && timeAtBar <= w.end);
                      const barProgressRatio = i / 40;
                      const videoCurrentRatio = currentTime / duration;
                      const isActive = barProgressRatio <= videoCurrentRatio;
                      const randomNoise = (Math.sin(i * 1.5) + 1) * 8;
                      const baseHeight = isSpoken ? 55 : 20;
                      const barHeight = Math.min(95, baseHeight + randomNoise);

                      return (
                        <div 
                          key={i}
                          className={`waveform-bar ${isActive ? 'active' : ''} ${isSpoken ? 'spoken' : ''}`}
                          style={{ height: `${barHeight}%` }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Subtitle Styles and Presets */}
                <div className="style-pills">
                  <div className="pill-group">
                    <button
                      className={`pill ${captionStyle === 'typography_motion' ? 'active' : ''}`}
                      onClick={() => setCaptionStyle('typography_motion')}
                    >
                      <Type size={13} /> Karaoke Pop
                    </button>
                    <button
                      className={`pill ${captionStyle === 'hormozi' ? 'active' : ''}`}
                      onClick={() => setCaptionStyle('hormozi')}
                    >
                      <Sparkles size={13} /> Hormozi Bold
                    </button>
                    <button
                      className={`pill ${captionStyle === 'minimal_modern' ? 'active' : ''}`}
                      onClick={() => setCaptionStyle('minimal_modern')}
                    >
                      <Monitor size={13} /> Cinematic Minimal
                    </button>
                  </div>
                  <div className="pill-group">
                    <button
                      className={`pill ${preset === 'tiktok' ? 'active' : ''}`}
                      onClick={() => setPreset('tiktok')}
                    >
                      <Video size={13} /> 9:16
                    </button>
                    <button
                      className={`pill ${preset === 'youtube_shorts' ? 'active' : ''}`}
                      onClick={() => setPreset('youtube_shorts')}
                    >
                      9:16
                    </button>
                    <button
                      className={`pill ${preset === 'landscape' ? 'active' : ''}`}
                      onClick={() => setPreset('landscape')}
                    >
                      16:9
                    </button>
                  </div>
                  {showAdvanced && (
                    <div className="pill-group">
                      <label className="pill-input-label">
                        <Sliders size={13} />
                        <input
                          type="text"
                          value={hookCaption}
                          onChange={(e) => setHookCaption(e.target.value)}
                          placeholder="Hook caption..."
                          className="pill-input"
                        />
                      </label>
                    </div>
                  )}
                  <button
                    className="pill pill-more"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    title="More options"
                  >
                    <Ellipsis size={14} />
                  </button>
                </div>
              </div>

              {/* Right Column: Transcript */}
              <div className="transcript-column">
                <div className="transcript-header">
                  <h3>Transcript</h3>
                </div>

                <div className="words-scrollable">
                  {words.length === 0 ? (
                    <div className="empty-transcript">
                      <p className="text-muted text-sm">No transcript yet</p>
                    </div>
                  ) : (
                    <div className="words-grid">
                      {words.map((word, idx) => (
                        <div 
                          key={idx}
                          className={`word-card ${activeWordIdx === idx ? 'active' : ''} ${editingWordIdx === idx ? 'editing' : ''}`}
                          onClick={() => handleWordClick(word)}
                        >
                          {editingWordIdx === idx ? (
                            <input 
                              type="text" 
                              value={word.word ?? ''}
                              onChange={(e) => handleWordChange(idx, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setEditingWordIdx(null);
                                }
                              }}
                              onBlur={() => setEditingWordIdx(null)}
                              className="word-input-edit"
                              autoFocus
                            />
                          ) : (
                            <div className="word-display">
                              <span className="word-text">{word.word}</span>
                              <button
                                className="word-edit-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingWordIdx(idx);
                                }}
                                title="Edit word"
                              >
                                <Pencil size={11} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="transcript-footer">
                  <input 
                    type="text" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Clip title"
                    className="pill-input"
                  />
                  <div className="transcript-actions">
                    <button className="reset-btn" onClick={() => {
                      if (clip.words && clip.words.length > 0) {
                        setWords(JSON.parse(JSON.stringify(clip.words)));
                      } else {
                        setWords(getMockWords(clip));
                      }
                    }}>
                      <RotateCcw size={14} /> Reset
                    </button>
                    {onExport && (
                      <button 
                        className="export-trigger-btn" 
                        onClick={onExport}
                        type="button"
                      >
                        <Share2 size={14} /> Export
                      </button>
                    )}
                    <button className="glow-button" onClick={handleSave} disabled={isSaving}>
                      <Save size={14} /> Save Changes
                    </button>
                  </div>
                </div>
              </div>

            </div>

          </motion.div>

          <style jsx>{`
            .error-banner {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
              padding: 10px 16px;
              margin-bottom: 12px;
              background: rgba(239, 68, 68, 0.08);
              border: 1px solid rgba(239, 68, 68, 0.18);
              border-radius: 10px;
              color: #fca5a5;
              font-size: 13px;
              font-weight: 500;
            }
            .error-dismiss {
              background: none;
              border: none;
              color: #fca5a5;
              cursor: pointer;
              padding: 2px;
              border-radius: 4px;
              display: flex;
              align-items: center;
            }
            .error-dismiss:hover {
              background: rgba(239, 68, 68, 0.15);
            }

            .editor-overlay {
              position: fixed;
              top: 0; left: 0; width: 100%; height: 100%;
              background: rgba(0,0,0,0.85);
              backdrop-filter: blur(12px);
              z-index: 1000;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 24px;
            }
            .editor-window {
              width: 100%;
              max-width: 980px;
              height: 95vh;
              display: flex;
              flex-direction: column;
              padding: 32px;
              position: relative;
              overflow: hidden;
            }
            @media (max-width: 640px) {
              .editor-window {
                padding: 20px;
              }
              .editor-layout {
                gap: 20px;
              }
              .words-grid {
                grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
              }
            }
            @media (min-width: 768px) {
              .editor-window {
                height: 80vh;
                max-height: 800px;
              }
            }
            .loading-overlay {
              position: absolute;
              top: 0; left: 0; width: 100%; height: 100%;
              background: rgba(0,0,0,0.92);
              backdrop-filter: blur(8px);
              z-index: 1100;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 16px;
            }
            .spinner {
              width: 48px;
              height: 48px;
              border: 3px solid rgba(255,255,255,0.05);
              border-top-color: var(--accent);
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
            
            .editor-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
              padding-bottom: 12px;
            }
            .header-title {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .header-title h2 { font-size: 16px; font-weight: 600; color: var(--muted-strong); }
            .close-btn { background: none; border: none; color: var(--muted); cursor: pointer; }

            .editor-layout {
              display: grid;
              grid-template-columns: 1fr;
              gap: 32px;
              flex: 1;
              min-height: 0;
              overflow-y: auto;
            }
            @media (min-width: 768px) {
              .editor-layout {
                grid-template-columns: 1fr 320px;
                overflow: hidden;
              }
            }

            .player-column {
              display: flex;
              flex-direction: column;
              gap: 12px;
              height: 100%;
              overflow-y: auto;
            }
            .video-viewport {
              background: #000;
              border-radius: 14px;
              position: relative;
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .preview-video {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .viewport-overlay {
              position: absolute;
              top: 0; left: 0; width: 100%; height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
            }
            .play-button-large {
              width: 48px; height: 48px;
              background: rgba(139, 92, 246, 0.7);
              border: none; border-radius: 50%;
              display: flex; align-items: center; justify-content: center;
              cursor: pointer;
              transition: 0.2s ease-in-out;
            }
            .play-button-large:hover {
              background: var(--accent);
            }
            .style-pills {
              display: flex;
              flex-direction: column;
              gap: 10px;
              position: relative;
            }
            .pill-more {
              position: absolute;
              top: 0;
              right: 0;
              padding: 6px 8px;
              min-width: 32px;
              justify-content: center;
            }
            .pill-more:hover {
              background: rgba(255,255,255,0.04);
            }
            .pill-group {
              display: flex;
              gap: 6px;
              align-items: center;
            }
            .pill {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 6px 14px;
              border-radius: 8px;
              border: 1px solid rgba(255,255,255,0.06);
              background: transparent;
              color: var(--muted);
              font-size: 12px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.15s ease;
            }
            .pill:hover {
              border-color: rgba(255,255,255,0.14);
              color: var(--muted-strong);
            }
            .pill.active {
              background: rgba(139, 92, 246, 0.12);
              border-color: rgba(139, 92, 246, 0.35);
              color: #c4b5fd;
            }
            .pill-input-label {
              display: flex;
              align-items: center;
              gap: 8px;
              width: 100%;
            }
            .pill-input {
              flex: 1;
              background: transparent;
              border: 0;
              border-bottom: 1px solid rgba(255,255,255,0.06);
              padding: 6px 0;
              color: #fff;
              font-size: 12px;
              font-weight: 500;
              outline: none;
              transition: border-color 0.15s ease;
            }
            .pill-input:focus {
              border-bottom-color: rgba(139,92,246,0.4);
            }
            .pill-input::placeholder {
              color: var(--muted);
              opacity: 0.6;
            }

            .transcript-column {
              display: flex;
              flex-direction: column;
              height: 100%;
              overflow: hidden;
            }
            .transcript-header {
              padding: 16px 20px 12px;
            }
            .transcript-header h3 { font-size: 13px; font-weight: 600; color: var(--muted); }
            
            .words-scrollable {
              flex: 1;
              overflow-y: auto;
              padding: 8px 20px;
            }
            .words-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
              gap: 8px;
            }
            .word-card {
              background: rgba(255, 255, 255, 0.02);
              border: 1px solid rgba(255, 255, 255, 0.04);
              border-radius: 8px;
              padding: 10px 14px;
              cursor: pointer;
              transition: all 0.15s ease;
            }
            .word-card:hover {
              background: rgba(255, 255, 255, 0.05);
              border-color: rgba(255, 255, 255, 0.1);
            }
            .word-card.active {
              background: rgba(139, 92, 246, 0.08);
              border-color: rgba(139, 92, 246, 0.4);
            }
            .word-display {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 6px;
            }
            .word-text {
              font-size: 15px;
              color: #ffffff;
              font-weight: 600;
              text-align: center;
              flex: 1;
            }
            .word-edit-btn {
              display: flex;
              align-items: center;
              justify-content: center;
              background: none;
              border: none;
              color: var(--muted);
              cursor: pointer;
              opacity: 0;
              transition: opacity 0.15s ease;
              padding: 2px;
              border-radius: 4px;
              flex-shrink: 0;
            }
            .word-card:hover .word-edit-btn {
              opacity: 1;
            }
            .word-edit-btn:hover {
              color: #fff;
              background: rgba(255,255,255,0.08);
            }
            .word-card.editing {
              border-color: rgba(246, 92, 139, 0.4);
              background: rgba(246, 92, 139, 0.06);
            }
            .word-input-edit {
              background: transparent;
              border: 0;
              color: #ffffff;
              font-size: 14px;
              font-weight: 600;
              padding: 0;
              outline: none;
              width: 100%;
              text-align: center;
            }
            .word-input-edit:focus {
              box-shadow: none;
            }
            .transcript-footer {
              padding: 12px 20px 16px;
            }
            .transcript-actions {
              display: flex;
              gap: 8px;
              margin-top: 12px;
            }
            .transcript-actions .glow-button {
              flex: 1;
              justify-content: center;
            }

            .reset-btn {
              background: none;
              padding: 8px 14px;
              border-radius: 8px;
              display: inline-flex;
              align-items: center;
              gap: 6px;
              font-size: 12px;
              font-weight: 600;
              color: var(--muted);
              cursor: pointer;
              border: 1px solid rgba(255,255,255,0.06);
            }
            .reset-btn:hover {
              color: #fff;
            }
            .mt-4 { margin-top: 16px; }
            .flex { display: flex; }
            .gap-2 { gap: 8px; }
            .gap-4 { gap: 16px; }
            .items-center { align-items: center; }

            .safe-zone-toggle {
              position: absolute;
              top: 12px;
              right: 12px;
              z-index: 20;
              padding: 6px 12px;
              border-radius: 8px;
              font-size: 11px;
              font-weight: 750;
              display: flex;
              align-items: center;
              gap: 6px;
              color: var(--muted-strong);
              background: rgba(10, 13, 22, 0.65);
              border: 1px solid rgba(255, 255, 255, 0.08);
              cursor: pointer;
              transition: all 0.2s ease;
            }
            .safe-zone-toggle:hover {
              background: rgba(10, 13, 22, 0.85);
              color: #ffffff;
              border-color: rgba(246, 92, 139, 0.3);
            }
            .safe-zone-toggle.active {
              background: rgba(246, 92, 139, 0.15);
              border-color: rgba(246, 92, 139, 0.4);
              color: #f65c8b;
            }

            .tiktok-safe-overlay {
              position: absolute;
              inset: 0;
              z-index: 10;
              pointer-events: none;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              padding: 48px 12px 16px 12px;
              color: #ffffff;
              font-family: 'Inter', sans-serif;
              background: rgba(0, 0, 0, 0.05);
            }
            .tok-header {
              display: flex;
              justify-content: center;
              gap: 16px;
              font-size: 14px;
              font-weight: 600;
              opacity: 0.65;
            }
            .tok-header span.active {
              opacity: 1;
              position: relative;
            }
            .tok-header span.active::after {
              content: "";
              position: absolute;
              bottom: -4px;
              left: 20%;
              width: 60%;
              height: 2px;
              background: #ffffff;
              border-radius: 99px;
            }
            .tok-actions {
              position: absolute;
              right: 8px;
              bottom: 120px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 14px;
              opacity: 0.72;
            }
            .tok-avatar {
              position: relative;
              width: 38px;
              height: 38px;
              margin-bottom: 4px;
            }
            .avatar-img {
              width: 100%;
              height: 100%;
              border-radius: 50%;
              background: #f65c8b;
              border: 1px solid #ffffff;
            }
            .avatar-plus {
              position: absolute;
              bottom: -4px;
              left: 50%;
              transform: translateX(-50%);
              background: #fe2c55;
              color: #ffffff;
              font-size: 10px;
              width: 14px;
              height: 14px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
            }
            .tok-action-item {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 2px;
            }
            .tok-action-item span {
              font-size: 10px;
              font-weight: 600;
            }
            .tok-icon-heart::before { content: "❤️"; font-size: 22px; }
            .tok-icon-comment::before { content: "💬"; font-size: 22px; }
            .tok-icon-bookmark::before { content: "💛"; font-size: 22px; }
            .tok-icon-share::before { content: "➡️"; font-size: 22px; }
            .tok-music-disc {
              width: 28px;
              height: 28px;
              border-radius: 50%;
              background: conic-gradient(#111, #444, #111);
              border: 4px solid #333;
              animation: rotate 4s linear infinite;
            }
            
            .tok-details {
              display: flex;
              flex-direction: column;
              gap: 6px;
              width: 78%;
              text-align: left;
              opacity: 0.72;
              font-size: 12px;
            }
            .tok-username {
              font-weight: 700;
            }
            .tok-caption {
              line-height: 1.35;
              display: -webkit-box;
              -webkit-line-clamp: 3;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
            .tok-music {
              display: flex;
              align-items: center;
              gap: 6px;
              font-weight: 600;
            }

            .audio-waveform-container {
              padding: 8px 0;
              display: flex;
              flex-direction: column;
            }
            .waveform-visualizer {
              height: 44px;
              display: flex;
              align-items: center;
              gap: 4px;
              cursor: pointer;
              padding: 4px 0;
            }
            .waveform-bar {
              flex: 1;
              background: rgba(255, 255, 255, 0.16);
              border-radius: 2px;
              transition: background 0.1s ease, transform 0.1s ease;
            }
            .waveform-bar.active {
              background: linear-gradient(to top, #8b5cf6, #f65c8b);
            }
            .waveform-bar.active.spoken {
              background: linear-gradient(to top, #f65c8b, #ff7b9f);
              box-shadow: 0 0 8px rgba(246, 92, 139, 0.4);
            }
            .waveform-visualizer:hover .waveform-bar {
              transform: scaleY(1.05);
            }



            .export-trigger-btn {
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid rgba(255, 255, 255, 0.06);
              color: var(--muted-strong);
              padding: 8px 14px;
              height: auto;
              border-radius: 8px;
              font-size: 12px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.15s ease;
              display: inline-flex;
              align-items: center;
              gap: 6px;
            }
            .export-trigger-btn:hover {
              background: rgba(246, 92, 139, 0.1);
              border-color: rgba(246, 92, 139, 0.3);
              color: #ffffff;
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  );
}
