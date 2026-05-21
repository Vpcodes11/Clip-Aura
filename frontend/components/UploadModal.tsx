"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, X, Upload, Link as LinkIcon, Sparkles, Smartphone, Monitor, Square as SquareIcon, Check } from 'lucide-react';
import { authenticatedFetch } from '@/lib/supabase';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadStarted?: () => void;
}

export default function UploadModal({ isOpen, onClose, onUploadStarted }: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuration states
  const [selectedPreset, setSelectedPreset] = useState('tiktok');
  const [selectedStyle, setSelectedStyle] = useState('typography_motion');
  const [enableHookOpt, setEnableHookOpt] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [step, setStep] = useState(1);

  // Dynamic configurations fetched from API
  const [presetsList, setPresetsList] = useState<Record<string, any>>({
    tiktok: { label: "TikTok / Reels (9:16)" },
    youtube_shorts: { label: "YouTube Shorts (9:16)" },
    square: { label: "Square (1:1)" },
    landscape: { label: "Landscape (16:9)" },
  });
  const [stylesList, setStylesList] = useState<Record<string, any>>({
    tiktok: { name: "TikTok Pop" },
    minimal: { name: "Minimal Modern" },
    viral: { name: "Viral Hook" },
    bold_impact: { name: "Bold Impact" },
    neon_pulse: { name: "Neon Pulse" },
    karaoke: { name: "Karaoke Bounce" },
    high_intensity: { name: "High Intensity" },
    minimal_modern: { name: "Minimal Plain" },
    premium_aesthetic: { name: "Premium Aesthetic" },
    typography_motion: { name: "Cursive + CAPS" },
    stealth_pro: { name: "Stealth Pro" },
    hormozi: { name: "Hormozi Pop" },
    ali_abdaal: { name: "Ali Abdaal Clean" },
  });

  // Fetch presets and styles from API
  useEffect(() => {
    if (!isOpen) return;
    const loadPresets = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await authenticatedFetch(`${apiUrl}/api/presets`);
        if (res.ok) {
          const data = await res.json();
          if (data.presets) setPresetsList(data.presets);
          if (data.caption_styles) setStylesList(data.caption_styles);
        }
      } catch (err) {
        console.error("Failed to fetch presets:", err);
      }
    };
    loadPresets();
  }, [isOpen]);

  // Reset modal state on open/close
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setUrl('');
      setError(null);
      setShowAdvanced(false);
      setStep(1);
    }
  }, [isOpen]);

  const handleUpload = async () => {
    setError(null);
    if (activeTab === 'upload' && !file) {
      setError('Please select a video to upload.');
      return;
    }
    if (activeTab === 'url' && !url) {
      setError('Please paste a YouTube or video link.');
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      if (activeTab === 'upload' && file) {
        formData.append('file', file);
      } else {
        formData.append('url', url);
      }
      
      formData.append('preset', selectedPreset);
      formData.append('caption_style', selectedStyle);
 
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const data = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${apiUrl}/api/upload`);

        const token = localStorage.getItem('sb-access-token');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              resolve({});
            }
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.detail || 'Upload failed'));
            } catch {
              reject(new Error('Upload failed'));
            }
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error during upload.')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled.')));

        xhr.send(formData);
      });

      console.log('Job started:', data.job_id);
      onUploadStarted?.();
      onClose();
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleTabChange = (tab: 'upload' | 'url') => {
    setActiveTab(tab);
    setError(null);
    setFile(null);
    setUrl('');
  };

  const handleFiles = (selectedFile?: File) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setError(null);
  };

  const isNextDisabled = activeTab === 'upload' ? !file : !url.trim();

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
                <h2>Generate Shorts</h2>
              </div>
              <div className="step-indicator-bar">
                <div className={`step-dot ${step === 1 ? 'active' : ''}`}>1</div>
                <div className="step-line"></div>
                <div className={`step-dot ${step === 2 ? 'active' : ''}`}>2</div>
              </div>
              <button onClick={onClose} className="close-btn" disabled={isUploading}><X size={20} /></button>
            </div>

            {step === 1 ? (
              <>
                <div className="modal-tabs">
                  <button 
                    className={`modal-tab ${activeTab === 'upload' ? 'active' : ''}`}
                    onClick={() => handleTabChange('upload')}
                    disabled={isUploading}
                  >
                    <Upload size={16} /> Upload Video
                  </button>
                  <button 
                    className={`modal-tab ${activeTab === 'url' ? 'active' : ''}`}
                    onClick={() => handleTabChange('url')}
                    disabled={isUploading}
                  >
                    <LinkIcon size={16} /> Paste URL
                  </button>
                </div>

                <div className="modal-body">
                  {activeTab === 'upload' ? (
                    <div 
                      className={`drop-zone ${isDragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
                      onClick={() => !isUploading && fileInputRef.current?.click()}
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (!isUploading) setIsDragActive(true);
                      }}
                      onDragLeave={() => setIsDragActive(false)}
                      onDrop={(event) => {
                        event.preventDefault();
                        setIsDragActive(false);
                        if (!isUploading) handleFiles(event.dataTransfer.files?.[0]);
                      }}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={(e) => handleFiles(e.target.files?.[0])}
                        style={{ display: 'none' }}
                        disabled={isUploading}
                      />
                      {file ? (
                        <div className="file-selected">
                          <div className="selected-icon"><CheckCircle2 size={22} /></div>
                          <span>{file.name}</span>
                          <small>{(file.size / (1024 * 1024)).toFixed(1)} MB ready</small>
                        </div>
                      ) : (
                        <>
                          <Upload size={32} className="text-muted" />
                          <p>Drop a video here or tap to browse</p>
                          <span className="text-muted text-xs">MP4, MOV, or WEBM up to 2 GB</span>
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
                        disabled={isUploading}
                      />
                      <small className="text-muted text-xs block mt-2 px-1">Paste a YouTube link or direct video URL.</small>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="modal-body presets-section">
                <h3 className="section-title">Select Video Layout</h3>
                
                {/* Preset layout grids */}
                <div className="presets-grid">
                  {Object.entries(presetsList).map(([key, value]) => {
                    const isSelected = selectedPreset === key;
                    const label = value.label || key;
                    let aspectIcon = <Smartphone size={16} />;
                    if (key === 'landscape') aspectIcon = <Monitor size={16} />;
                    if (key === 'square') aspectIcon = <SquareIcon size={16} />;

                    return (
                      <div 
                        key={key} 
                        className={`preset-card ${isSelected ? 'active' : ''}`}
                        onClick={() => setSelectedPreset(key)}
                      >
                        <div className="preset-card-glow" />
                        <span className="preset-icon">{aspectIcon}</span>
                        <span className="preset-label">{label.split(" (")[0]}</span>
                        <span className="preset-sub">{label.includes(" (") ? `(${label.split(" (")[1]}` : ''}</span>
                        {isSelected && <span className="selected-badge"><Check size={10} /></span>}
                      </div>
                    );
                  })}
                </div>

                {/* Advanced Settings Toggle */}
                <div className="advanced-toggle-wrapper mt-4">
                  <button 
                    type="button"
                    className="advanced-toggle-btn"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    {showAdvanced ? "Hide advanced settings" : "Show advanced settings"}
                  </button>
                </div>

                {/* Progressive Disclosure Section */}
                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="advanced-settings-content mt-2"
                      style={{ overflow: 'hidden' }}
                    >
                      {/* Caption Styles Selection */}
                      <div className="style-selection-box mt-2">
                        <label className="input-label">Subtitle Caption Style</label>
                        <div className="select-container">
                          <select 
                            value={selectedStyle}
                            onChange={(e) => setSelectedStyle(e.target.value)}
                            className="stealth-select-styled"
                          >
                            {Object.entries(stylesList).map(([key, val]) => (
                              <option key={key} value={key}>
                                {val.name || key.replace('_', ' ').toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Hook optimization checkbox */}
                      <label className="checkbox-container mt-4">
                        <input 
                          type="checkbox" 
                          checked={enableHookOpt} 
                          onChange={(e) => setEnableHookOpt(e.target.checked)} 
                        />
                        <span className="checkbox-custom" />
                        <div className="checkbox-text">
                          <span>Enable AI Hook Optimization</span>
                          <small>Find stronger hook moments before rendering.</small>
                        </div>
                      </label>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="modal-footer">
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="error-message-tooltip font-semibold text-xs"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {isUploading && (
                <div className="upload-progress">
                  <span><Loader2 className="spin" size={14} /> Uploading and starting pipeline</span>
                  <i />
                </div>
              )}

              {step === 1 ? (
                <div className="flex gap-3 w-full">
                  <button 
                    className="glow-button flex-1" 
                    disabled={isNextDisabled}
                    onClick={() => setStep(2)}
                  >
                    Next: Configure Layout ⚡
                  </button>
                </div>
              ) : (
                <div className="flex gap-3 w-full">
                  <button 
                    className="reset-btn glass-btn" 
                    disabled={isUploading}
                    onClick={() => setStep(1)}
                  >
                    Back
                  </button>
                  <button 
                    className="glow-button flex-1" 
                    disabled={isUploading}
                    onClick={handleUpload}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="spin" size={16} /> Starting pipeline
                      </>
                    ) : (
                      <>
                        Generate Clips ⚡
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <style jsx>{`
              .modal-overlay {
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.85);
                backdrop-filter: blur(12px);
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
              }
              .modal-content {
                width: 100%;
                max-width: 520px;
                max-height: 90vh;
                overflow-y: auto;
                padding: 32px;
                display: flex;
                flex-direction: column;
                gap: 24px;
                animation: modalIn 0.24s ease both;
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
              .modal-title h2 { 
                font-family: var(--font-outfit);
                font-size: 20px; 
                font-weight: 700;
                letter-spacing: -0.02em;
              }
              .close-btn {
                width: 38px;
                height: 38px;
                background: rgba(255, 255, 255, 0.045);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 10px;
                color: var(--muted);
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
              }
              .close-btn:hover {
                color: #fff;
                background: rgba(255,255,255,0.1);
              }
              
              .step-indicator-bar {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                margin: 0 auto;
                width: fit-content;
              }
              .step-dot {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: var(--muted);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: 800;
                transition: all 0.3s ease;
              }
              .step-dot.active {
                background: var(--accent);
                border-color: var(--accent);
                color: #fff;
                box-shadow: 0 0 10px rgba(246, 92, 139, 0.3);
              }
              .step-line {
                width: 40px;
                height: 2px;
                background: rgba(255, 255, 255, 0.08);
              }
              
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
                min-height: 42px;
                padding: 8px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                color: var(--muted);
                background: none;
                border: none;
                cursor: pointer;
                transition: all 0.2s ease;
                touch-action: manipulation;
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
                transition: all 0.2s ease;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
                min-height: 178px;
                touch-action: manipulation;
              }
              .drop-zone:hover {
                border-color: var(--accent);
                background: rgba(246, 92, 139, 0.04);
              }
              .drop-zone.active {
                border-color: var(--accent-2);
                background: rgba(6, 182, 212, 0.08);
                transform: translateY(-1px);
              }
              .drop-zone.has-file {
                border-style: solid;
                border-color: rgba(16, 185, 129, 0.28);
                background: rgba(16, 185, 129, 0.02);
              }
              .file-selected {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
                max-width: 100%;
              }
              .file-selected span {
                max-width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                font-weight: 700;
              }
              .file-selected small {
                color: var(--muted);
                font-size: 12px;
              }
              .selected-icon {
                width: 40px; height: 40px;
                color: #86efac;
                background: rgba(16, 185, 129, 0.12); border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                font-weight: 800;
              }
              
              .stealth-input {
                width: 100%;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 10px;
                padding: 16px;
                color: #fff;
                font-family: var(--font-inter);
                outline: none;
                min-height: 50px;
                transition: all 0.2s ease;
                box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
              }
              .stealth-input:focus { 
                border-color: var(--accent);
                background: rgba(255,255,255,0.05);
                box-shadow: 0 0 0 3px rgba(246, 92, 139, 0.15), inset 0 2px 4px rgba(0, 0, 0, 0.2);
              }

              .section-title {
                font-family: var(--font-outfit);
                font-size: 14px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: var(--muted-strong);
                margin-bottom: 12px;
              }

              .presets-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
              }
              .preset-card {
                background: rgba(255, 255, 255, 0.015);
                border: 1px solid rgba(255, 255, 255, 0.06);
                border-radius: 12px;
                padding: 16px;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                cursor: pointer;
                position: relative;
                overflow: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              }
              .preset-card:hover {
                background: rgba(255, 255, 255, 0.04);
                border-color: rgba(255, 255, 255, 0.15);
                transform: translateY(-2px);
              }
              .preset-card.active {
                background: rgba(246, 92, 139, 0.04);
                border-color: var(--accent);
                box-shadow: 0 0 20px rgba(246, 92, 139, 0.15), inset 0 1px 0 rgba(255,255,255,0.08);
              }
              .preset-card-glow {
                position: absolute;
                top: 0; left: 0; width: 100%; height: 100%;
                background: linear-gradient(135deg, rgba(246, 92, 139, 0.15), transparent);
                opacity: 0;
                transition: opacity 0.3s ease;
              }
              .preset-card.active .preset-card-glow {
                opacity: 1;
              }
              .preset-icon {
                color: var(--muted);
                margin-bottom: 8px;
                transition: color 0.3s ease;
                z-index: 1;
              }
              .preset-card.active .preset-icon {
                color: var(--accent);
              }
              .preset-label {
                font-family: var(--font-outfit);
                font-size: 14px;
                font-weight: 700;
                color: #fff;
                z-index: 1;
              }
              .preset-sub {
                font-size: 11px;
                color: var(--muted);
                z-index: 1;
              }
              .selected-badge {
                position: absolute;
                top: 10px; right: 10px;
                width: 16px; height: 16px;
                border-radius: 50%;
                background: var(--accent);
                color: #fff;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1;
              }

              .style-selection-box {
                display: flex;
                flex-direction: column;
                gap: 6px;
              }
              .input-label {
                font-size: 11px;
                font-weight: 700;
                color: var(--muted);
                text-transform: uppercase;
                letter-spacing: 0.05em;
              }
              .select-container {
                position: relative;
                width: 100%;
              }
              .stealth-select-styled {
                width: 100%;
                background: rgba(255, 255, 255, 0.015);
                border: 1px solid rgba(255, 255, 255, 0.06);
                border-radius: 10px;
                padding: 12px 16px;
                color: #fff;
                font-size: 13px;
                font-weight: 600;
                outline: none;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
              }
              .stealth-select-styled:hover {
                background: rgba(255, 255, 255, 0.04);
                border-color: rgba(255, 255, 255, 0.15);
              }
              .stealth-select-styled:focus {
                border-color: var(--accent);
                box-shadow: 0 0 0 3px rgba(246, 92, 139, 0.15), inset 0 2px 4px rgba(0, 0, 0, 0.2);
              }
              .stealth-select-styled option {
                background: #0d0d12;
                color: #ffffff;
                padding: 12px;
              }

              .checkbox-container {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                cursor: pointer;
                user-select: none;
              }
              .checkbox-container input {
                position: absolute;
                opacity: 0;
                cursor: pointer;
                height: 0; width: 0;
              }
              .checkbox-custom {
                width: 18px;
                height: 18px;
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                margin-top: 2px;
              }
              .checkbox-container:hover input ~ .checkbox-custom {
                background: rgba(255, 255, 255, 0.06);
                border-color: rgba(255, 255, 255, 0.2);
              }
              .checkbox-container input:checked ~ .checkbox-custom {
                background: var(--accent);
                border-color: var(--accent);
              }
              .checkbox-custom::after {
                content: "";
                display: none;
                width: 5px;
                height: 9px;
                border: solid white;
                border-width: 0 2px 2px 0;
                transform: rotate(45deg) translate(-1px, -1px);
              }
              .checkbox-container input:checked ~ .checkbox-custom::after {
                display: block;
              }
              .checkbox-text {
                display: flex;
                flex-direction: column;
                gap: 2px;
              }
              .checkbox-text span {
                font-size: 13px;
                font-weight: 700;
                color: #fff;
              }
              .checkbox-text small {
                font-size: 11px;
                color: var(--muted);
                line-height: 1.4;
              }
              
              .w-full { width: 100%; }
              .flex-1 { flex: 1; }
              .flex { display: flex; }
              .gap-3 { gap: 12px; }
              .mt-4 { margin-top: 16px; }
              .block { display: block; }
              .px-1 { padding-left: 4px; padding-right: 4px; }
              .ml-1 { margin-left: 4px; }
              
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
              .upload-progress {
                display: grid;
                gap: 8px;
                margin-bottom: 12px;
                color: var(--muted-strong);
                font-size: 12px;
                font-weight: 750;
              }
              .upload-progress span {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
              }
              .upload-progress i {
                height: 6px;
                border-radius: 999px;
                overflow: hidden;
                background: linear-gradient(90deg, #06b6d4, #f65c8b, #06b6d4);
                background-size: 200% 100%;
                animation: progressMove 1.1s linear infinite;
              }
              .spin {
                animation: spin 1.1s linear infinite;
              }
              .reset-btn {
                background: none;
                padding: 10px 20px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                font-size: 13px;
                font-weight: 600;
                color: var(--muted);
                cursor: pointer;
                transition: all 0.2s ease;
              }
              .glass-btn {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.06);
              }
              .glass-btn:hover {
                background: rgba(255, 255, 255, 0.08);
                color: #fff;
                border-color: rgba(255, 255, 255, 0.12);
              }
              .advanced-toggle-btn {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.08);
                color: var(--muted-strong);
                width: 100%;
                padding: 12px 14px;
                border-radius: 10px;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
              }
              .advanced-toggle-btn:hover {
                background: rgba(255, 255, 255, 0.06);
                border-color: rgba(255, 255, 255, 0.15);
                color: #ffffff;
              }
              .advanced-settings-content {
                width: 100%;
              }

              @media (max-width: 640px) {
                .modal-overlay {
                  align-items: flex-end;
                  padding: 12px;
                }
                .modal-content {
                  max-height: 88vh;
                  padding: 22px;
                  gap: 18px;
                  border-radius: 18px 18px 14px 14px;
                }
                .drop-zone {
                  min-height: 150px;
                  padding: 28px 16px;
                }
                .presets-grid {
                  grid-template-columns: 1fr;
                }
              }
              @keyframes modalIn {
                from { opacity: 0; transform: translateY(10px) scale(0.98); }
                to { opacity: 1; transform: translateY(0) scale(1); }
              }
              @keyframes progressMove {
                to { background-position: 200% 0; }
              }
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
