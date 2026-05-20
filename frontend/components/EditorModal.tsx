"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Play, Save, RotateCcw, Video, Type, Sliders } from 'lucide-react';
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

export default function EditorModal({ isOpen, onClose, jobId, clip, clipIndex, onSaveSuccess }: EditorModalProps) {
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeWordIdx, setActiveWordIdx] = useState<number | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
        throw new Error('Failed to update clip parameters');
      }

      // Start polling to wait for the job status to become complete
      const pollTimer = setInterval(async () => {
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
              alert('Pipeline failed during caption re-rendering.');
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 2000);

    } catch (err) {
      console.error(err);
      alert('Failed to submit caption edits.');
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
                <h3>Regenerating Captions...</h3>
                <p className="text-muted text-sm">FFmpeg is rendering your custom typography and frames</p>
              </div>
            )}

            {/* Header */}
            <div className="editor-header">
              <div className="header-title">
                <Sparkles size={18} className="text-accent" />
                <h2>Clip Aura Studio Editor</h2>
                <span className="badge font-mono">CLIP #{clipIndex + 1}</span>
              </div>
              <button onClick={onClose} className="close-btn"><X size={20} /></button>
            </div>

            {/* Layout */}
            <div className="editor-layout">
              
              {/* Left Column: Player & Subtitle Canvas */}
              <div className="player-column">
                <div 
                  className="video-viewport glass"
                  style={{
                    aspectRatio: preset === 'landscape' ? '16/9' : '9/16',
                    height: '100%',
                    maxHeight: '380px',
                    margin: '0 auto',
                    transition: 'aspect-ratio 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  <video 
                    ref={videoRef}
                    src={`${apiUrl}/api/preview/${jobId}/${clip.filename}`} 
                    className="preview-video"
                    onClick={handlePlayPause}
                    onEnded={() => setIsPlaying(false)}
                  />
                  
                  {/* Real-time Subtitle Overlay Simulation */}
                  {isPlaying && activeWordIdx !== null && words[activeWordIdx] && (
                    <div className="subtitle-overlay font-mono">
                      {words[activeWordIdx].word.toUpperCase()}
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

                {/* Subtitle Styles and Presets */}
                <div className="controls-box glass">
                  <div className="control-row">
                    <div className="control-item">
                      <label><Type size={14} /> Caption Style</label>
                      <select 
                        value={captionStyle} 
                        onChange={(e) => setCaptionStyle(e.target.value)}
                        className="stealth-select"
                      >
                        <option value="typography_motion">Karaoke Pop (Dynamic)</option>
                        <option value="cursive_caps">Cursive + CAPS</option>
                        <option value="standard_caption">Standard Block</option>
                      </select>
                    </div>

                    <div className="control-item">
                      <label><Video size={14} /> Aspect Ratio</label>
                      <select 
                        value={preset} 
                        onChange={(e) => setPreset(e.target.value)}
                        className="stealth-select"
                      >
                        <option value="tiktok">Portrait (9:16)</option>
                        <option value="youtube_shorts">YouTube Shorts (9:16)</option>
                        <option value="landscape">Landscape (16:9)</option>
                      </select>
                    </div>
                  </div>

                  <div className="control-item mt-4">
                    <label><Sliders size={14} /> Hook Caption (Headline Overlay)</label>
                    <input 
                      type="text" 
                      value={hookCaption}
                      onChange={(e) => setHookCaption(e.target.value)}
                      placeholder="e.g. THE #1 SECRET OF SUCCESS..."
                      className="stealth-input-field"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Transcript */}
              <div className="transcript-column glass">
                <div className="transcript-header">
                  <h3>Interactive Transcript</h3>
                  <span className="text-muted text-xs">Click word to seek video · Type to edit text</span>
                </div>

                <div className="words-scrollable">
                  {words.length === 0 ? (
                    <div className="empty-transcript">
                      <p className="text-muted text-sm">Loading transcript timestamps...</p>
                    </div>
                  ) : (
                    <div className="words-grid">
                      {words.map((word, idx) => (
                        <div 
                          key={idx}
                          className={`word-card ${activeWordIdx === idx ? 'active' : ''}`}
                          onClick={() => handleWordClick(word)}
                        >
                          <div className="word-timestamp font-mono">
                            {word.start.toFixed(1)}s
                          </div>
                          <input 
                            type="text" 
                            value={word.word ?? ''}
                            onChange={(e) => handleWordChange(idx, e.target.value)}
                            onClick={(e) => e.stopPropagation()} 
                            className="word-input"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="transcript-footer">
                  <div className="control-item w-full">
                    <label>Clip Title</label>
                    <input 
                      type="text" 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)}
                      className="stealth-input-field"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="editor-footer">
              <button className="reset-btn glass" onClick={() => {
                if (clip.words && clip.words.length > 0) {
                  setWords(JSON.parse(JSON.stringify(clip.words)));
                } else {
                  setWords(getMockWords(clip));
                }
              }}>
                <RotateCcw size={16} /> Reset
              </button>
              <div className="flex gap-4">
                <button className="glow-button flex items-center gap-2" onClick={handleSave}>
                  <Save size={16} /> Save & Render ⚡
                </button>
              </div>
            </div>

          </motion.div>

          <style jsx>{`
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
              padding: 24px;
              position: relative;
              overflow: hidden;
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
              border-bottom: 1px solid rgba(255,255,255,0.05);
              padding-bottom: 16px;
            }
            .header-title {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .header-title h2 { font-size: 20px; font-weight: 700; }
            .badge {
              font-size: 10px;
              font-weight: 800;
              background: rgba(255,255,255,0.05);
              border: 1px solid rgba(255,255,255,0.1);
              padding: 2px 8px;
              border-radius: 4px;
              color: var(--accent);
            }
            .close-btn { background: none; border: none; color: var(--muted); cursor: pointer; }

            .editor-layout {
              display: grid;
              grid-template-columns: 1fr;
              gap: 24px;
              flex: 1;
              min-height: 0;
              overflow-y: auto;
            }
            @media (min-width: 768px) {
              .editor-layout {
                grid-template-columns: 420px 1fr;
                overflow: hidden;
              }
            }

            .player-column {
              display: flex;
              flex-direction: column;
              gap: 16px;
              height: 100%;
            }
            .video-viewport {
              background: #000;
              border-radius: 12px;
              position: relative;
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.8), 0 8px 32px rgba(0, 0, 0, 0.4);
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
              width: 56px; height: 56px;
              background: rgba(139, 92, 246, 0.8);
              border: none; border-radius: 50%;
              display: flex; align-items: center; justify-content: center;
              cursor: pointer;
              transition: 0.2s ease-in-out;
              box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
            }
            .play-button-large:hover {
              transform: scale(1.05);
              background: var(--accent);
            }
            .subtitle-overlay {
              position: absolute;
              bottom: 40px;
              left: 5%;
              right: 5%;
              text-align: center;
              background: rgba(0, 0, 0, 0.85);
              border: 2px solid var(--accent);
              padding: 8px 16px;
              border-radius: 8px;
              font-size: 18px;
              font-weight: 900;
              letter-spacing: 0.05em;
              color: #ffeb3b;
              text-shadow: 2px 2px 0px #000;
              animation: bounce 0.1s ease-in-out;
            }
            @keyframes bounce {
              0% { transform: scale(0.95); }
              100% { transform: scale(1.0); }
            }

            .controls-box {
              padding: 16px;
              border-radius: 12px;
            }
            .control-row {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }
            .control-item {
              display: flex;
              flex-direction: column;
              gap: 6px;
            }
            .control-item label {
              font-size: 11px;
              font-weight: 700;
              color: var(--muted);
              text-transform: uppercase;
              letter-spacing: 0.05em;
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .stealth-select {
              background: rgba(255, 255, 255, 0.015);
              border: 1px solid rgba(255, 255, 255, 0.05);
              border-radius: 10px;
              padding: 10px 14px;
              color: #fff;
              font-size: 13px;
              outline: none;
              cursor: pointer;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            .stealth-select:hover {
              background: rgba(255, 255, 255, 0.03);
              border-color: rgba(255, 255, 255, 0.12);
            }
            .stealth-select option {
              background: #0d0d12;
              color: #ffffff;
              padding: 12px;
            }
            .stealth-input-field {
              background: rgba(255, 255, 255, 0.015);
              border: 1px solid rgba(255, 255, 255, 0.05);
              border-radius: 10px;
              padding: 12px 16px;
              color: #fff;
              font-size: 13px;
              outline: none;
              width: 100%;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            .stealth-input-field:hover {
              background: rgba(255, 255, 255, 0.03);
              border-color: rgba(255, 255, 255, 0.12);
            }
            .stealth-input-field:focus, .stealth-select:focus {
              border-color: rgba(139, 92, 246, 0.5);
              background: rgba(255, 255, 255, 0.02);
              box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15), inset 0 2px 4px rgba(0, 0, 0, 0.2);
              transform: translateY(-1px);
            }

            .transcript-column {
              display: flex;
              flex-direction: column;
              border-radius: 12px;
              height: 100%;
              overflow: hidden;
            }
            .transcript-header {
              padding: 16px 20px;
              border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            .transcript-header h3 { font-size: 14px; font-weight: 700; }
            
            .words-scrollable {
              flex: 1;
              overflow-y: auto;
              padding: 20px;
            }
            .words-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
              gap: 10px;
            }
            .word-card {
              background: rgba(255, 255, 255, 0.015);
              border: 1px solid rgba(255, 255, 255, 0.04);
              border-radius: 10px;
              padding: 10px 14px;
              display: flex;
              flex-direction: column;
              gap: 6px;
              cursor: pointer;
              transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
            }
            .word-card:hover {
              background: rgba(255, 255, 255, 0.04);
              border-color: rgba(255, 255, 255, 0.12);
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }
            .word-card.active {
              background: rgba(139, 92, 246, 0.06);
              border-color: rgba(139, 92, 246, 0.6);
              box-shadow: 0 0 16px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1);
            }
            .word-timestamp {
              font-size: 10px;
              color: var(--accent);
              font-weight: 600;
              text-align: center;
            }
            .word-input {
              background: rgba(0, 0, 0, 0.2);
              border: 1px solid rgba(255, 255, 255, 0.04);
              border-radius: 6px;
              color: #fff;
              font-size: 13px;
              font-weight: 600;
              padding: 4px 8px;
              outline: none;
              width: 100%;
              transition: all 0.2s ease;
              text-align: center;
            }
            .word-input:hover {
              border-color: rgba(255, 255, 255, 0.1);
            }
            .word-input:focus {
              background: rgba(0, 0, 0, 0.4);
              border-color: rgba(139, 92, 246, 0.5);
              box-shadow: 0 0 8px rgba(139, 92, 246, 0.15);
            }
            .transcript-footer {
              padding: 16px 20px;
              border-top: 1px solid rgba(255,255,255,0.05);
              background: rgba(0,0,0,0.1);
            }

            .editor-footer {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-top: 20px;
              border-top: 1px solid rgba(255,255,255,0.05);
              padding-top: 16px;
            }
            .reset-btn {
              background: none;
              padding: 10px 20px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 13px;
              font-weight: 600;
              color: var(--muted);
              cursor: pointer;
            }
            .reset-btn:hover {
              color: #fff;
            }
            .mt-4 { margin-top: 16px; }
            .flex { display: flex; }
            .gap-2 { gap: 8px; }
            .gap-4 { gap: 16px; }
            .items-center { align-items: center; }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  );
}
