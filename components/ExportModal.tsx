"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Copy, Check, Share2, Phone, Sparkles, ExternalLink, Loader2 } from "lucide-react";
import { authenticatedFetch } from "@/lib/supabase";

export interface Clip {
  filename: string;
  title: string;
  virality_score: number;
  duration?: string | number;
  hook_caption?: string;
  preview_url?: string;
  reason?: string;
  category?: string;
  hashtags?: string[] | string;
  start_time: number;
  end_time: number;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  clip: Clip | null;
  clipIndex: number;
}

export default function ExportModal({ isOpen, onClose, jobId, clip, clipIndex }: ExportModalProps) {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  if (!clip) return null;

  const previewUrl = clip.preview_url
    ? (clip.preview_url.startsWith("http") ? clip.preview_url : `${apiUrl}${clip.preview_url}`)
    : "";
  const downloadUrl = `${apiUrl}/api/download/${jobId}/${clip.filename}`;
  
  // Format hashtags properly
  let hashtagsString = "";
  if (Array.isArray(clip.hashtags)) {
    hashtagsString = clip.hashtags.map(tag => tag.startsWith("#") ? tag : `#${tag}`).join(" ");
  } else if (typeof clip.hashtags === "string") {
    hashtagsString = clip.hashtags;
  } else {
    hashtagsString = "#viral #shorts #clipaura #creator";
  }

  // Create copy text package
  const creatorPackageText = `🎬 TITLE: ${clip.title}
🔥 HOOK: ${clip.hook_caption || clip.title}

💡 VIRAL EXPLANATION:
${clip.reason || "High energy segment with a hook and strong visual retention."}

📌 TAGS:
${hashtagsString}

Generated with ClipAura ✨`;

  const handleCopyPackage = async () => {
    try {
      await navigator.clipboard.writeText(creatorPackageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleDownloadVideo = async () => {
    setIsDownloading(true);
    setDownloadMessage(null);
    try {
      const response = await authenticatedFetch(downloadUrl);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = clip.filename || `clip-${clipIndex + 1}.mp4`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setDownloadMessage("Download started.");
      window.setTimeout(() => setDownloadMessage(null), 2400);
    } catch (err) {
      console.error("Failed to download clip:", err);
      setDownloadMessage("Could not download. Try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  // QR Server generates QR codes for our preview URLs
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(previewUrl)}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="export-overlay" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            className="export-window glass"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="export-header">
              <div className="header-title">
                <div className="icon-wrapper">
                  <Share2 size={18} className="text-accent" />
                </div>
                <div>
                  <h2>Creator Export Center</h2>
                  <p className="text-muted">Prepare, review, and deploy your viral short to socials</p>
                </div>
              </div>
              <button onClick={onClose} className="close-btn" aria-label="Close modal">
                <X size={20} />
              </button>
            </div>

            {/* Content Layout */}
            <div className="export-layout">
              {/* Left Column: Video & QR Transfer */}
              <div className="media-section glass">
                <div className="section-title">
                  <Phone size={15} />
                  <h3>Mobile Phone Transfer</h3>
                </div>

                <div className="qr-container">
                  <div className="qr-frame">
                    <img src={qrCodeUrl} alt="Scan QR Code to save on mobile" className="qr-image" />
                    <div className="qr-glow" />
                  </div>
                  <div className="qr-instructions">
                    <p className="primary-text">Scan to download on Phone</p>
                    <p className="secondary-text">Point your smartphone camera at the QR code to instantly play & save the video to your camera roll.</p>
                  </div>
                </div>

                <div className="divider" />

                <div className="download-actions">
                  <button onClick={handleDownloadVideo} disabled={isDownloading} className="download-btn glow-button">
                    {isDownloading ? <Loader2 className="spin" size={16} /> : downloadMessage === "Download started." ? <Check size={16} /> : <Download size={16} />}
                    {isDownloading ? "Preparing download" : downloadMessage === "Download started." ? "Download started" : "Download video"}
                  </button>
                  <button onClick={handleCopyLink} className="link-btn glass">
                    {copiedLink ? <Check size={16} className="success-color" /> : <ExternalLink size={16} />}
                    {copiedLink ? "Link Copied!" : "Copy Preview Link"}
                  </button>
                  {downloadMessage && downloadMessage !== "Download started." && (
                    <p className="download-message error">{downloadMessage}</p>
                  )}
                </div>
              </div>

              {/* Right Column: AI Marketing Package */}
              <div className="meta-section glass">
                <div className="section-title">
                  <Sparkles size={15} className="text-amber" />
                  <h3>AI Social Media Package</h3>
                </div>

                <div className="metadata-package">
                  <div className="meta-field">
                    <label>Suggested Title</label>
                    <div className="meta-value font-outfit">{clip.title}</div>
                  </div>

                  {clip.hook_caption && (
                    <div className="meta-field">
                      <label>AI Hook Headline</label>
                      <div className="meta-value hook-val font-mono">{clip.hook_caption}</div>
                    </div>
                  )}

                  <div className="meta-field">
                    <label>Virality Analytics & Explanation</label>
                    <div className="meta-value desc-val">
                      {clip.reason || "This clip includes a strong curiosity-inducing hook followed by a high-tempo segment, optimizing audience retention and click-through rates."}
                    </div>
                  </div>

                  <div className="meta-field">
                    <label>Optimized Social Hashtags</label>
                    <div className="meta-value tags-val font-mono">{hashtagsString}</div>
                  </div>
                </div>

                <button onClick={handleCopyPackage} className="copy-package-btn">
                  {copied ? (
                    <>
                      <Check size={16} />
                      Creator Package Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copy Creator Package ⚡
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          <style jsx>{`
            .export-overlay {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: rgba(4, 5, 9, 0.88);
              backdrop-filter: blur(20px);
              -webkit-backdrop-filter: blur(20px);
              z-index: 1200;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }

            .export-window {
              width: 100%;
              max-width: 900px;
              max-height: 90vh;
              display: flex;
              flex-direction: column;
              border-radius: 24px;
              padding: 24px;
              overflow-y: auto;
              position: relative;
              border: 1px solid rgba(255, 255, 255, 0.08);
              box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 24px 70px rgba(0, 0, 0, 0.4);
            }

            .export-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 24px;
              border-bottom: 1px solid rgba(255, 255, 255, 0.06);
              padding-bottom: 20px;
            }

            .header-title {
              display: flex;
              align-items: center;
              gap: 16px;
            }

            .icon-wrapper {
              width: 42px;
              height: 42px;
              border-radius: 12px;
              background: rgba(246, 92, 139, 0.12);
              border: 1px solid rgba(246, 92, 139, 0.25);
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .text-accent {
              color: #f65c8b;
            }

            .export-header h2 {
              font-size: 22px;
              font-weight: 800;
              letter-spacing: -0.02em;
              margin: 0 0 2px 0;
            }

            .export-header p {
              margin: 0;
              font-size: 13px;
            }

            .close-btn {
              background: none;
              border: none;
              color: var(--muted);
              cursor: pointer;
              padding: 6px;
              border-radius: 50%;
              transition: all 0.2s ease;
            }

            .close-btn:hover {
              color: #ffffff;
              background: rgba(255, 255, 255, 0.05);
            }

            .export-layout {
              display: grid;
              grid-template-columns: 1fr;
              gap: 20px;
            }

            @media (min-width: 768px) {
              .export-layout {
                grid-template-columns: 360px 1fr;
              }
            }

            .media-section,
            .meta-section {
              padding: 20px;
              border-radius: 18px;
              display: flex;
              flex-direction: column;
              gap: 18px;
            }

            .section-title {
              display: flex;
              align-items: center;
              gap: 8px;
              color: var(--muted-strong);
              border-bottom: 1px solid rgba(255, 255, 255, 0.05);
              padding-bottom: 10px;
              margin-bottom: 2px;
            }

            .section-title h3 {
              font-size: 14px;
              font-weight: 750;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }

            .qr-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 16px;
              text-align: center;
            }

            .qr-frame {
              position: relative;
              background: #ffffff;
              padding: 12px;
              border-radius: 16px;
              box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
              display: inline-block;
            }

            .qr-image {
              display: block;
              width: 140px;
              height: 140px;
            }

            .qr-glow {
              position: absolute;
              inset: -2px;
              border-radius: 18px;
              background: linear-gradient(135deg, #f65c8b, #8b5cf6);
              z-index: -1;
              opacity: 0.25;
              filter: blur(8px);
            }

            .qr-instructions {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }

            .qr-instructions .primary-text {
              font-weight: 700;
              font-size: 14px;
              color: #ffffff;
              margin: 0;
            }

            .qr-instructions .secondary-text {
              font-size: 12px;
              color: var(--muted);
              margin: 0;
              line-height: 1.4;
            }

            .divider {
              height: 1px;
              background: rgba(255, 255, 255, 0.06);
              margin: 4px 0;
            }

            .download-actions {
              display: flex;
              flex-direction: column;
              gap: 10px;
            }

            .download-btn {
              width: 100%;
              min-height: 42px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              font-size: 13px;
              font-weight: 750;
              border-radius: 12px;
              text-decoration: none;
              cursor: pointer;
              border: 0;
              background: linear-gradient(135deg, #f65c8b, #8b5cf6);
              color: #ffffff;
              transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .download-btn:hover {
              transform: translateY(-1px);
              box-shadow: 0 8px 24px rgba(246, 92, 139, 0.25);
            }

            .download-btn:disabled {
              cursor: wait;
              opacity: 0.82;
            }

            .link-btn {
              width: 100%;
              min-height: 42px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              font-size: 13px;
              font-weight: 700;
              border-radius: 12px;
              background: rgba(255, 255, 255, 0.04);
              border: 1px solid rgba(255, 255, 255, 0.08);
              color: var(--muted-strong);
              cursor: pointer;
              transition: all 0.2s ease;
            }

            .link-btn:hover {
              background: rgba(255, 255, 255, 0.08);
              color: #ffffff;
            }

            .metadata-package {
              display: flex;
              flex-direction: column;
              gap: 16px;
              flex: 1;
            }

            .meta-field {
              display: flex;
              flex-direction: column;
              gap: 6px;
            }

            .meta-field label {
              font-size: 11px;
              font-weight: 750;
              color: var(--muted);
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }

            .meta-value {
              background: rgba(0, 0, 0, 0.22);
              border: 1px solid rgba(255, 255, 255, 0.04);
              border-radius: 10px;
              padding: 12px 14px;
              font-size: 13px;
              color: #ffffff;
              line-height: 1.45;
            }

            .hook-val {
              border-color: rgba(246, 92, 139, 0.15);
              background: rgba(246, 92, 139, 0.02);
              color: #f65c8b;
              font-weight: 700;
            }

            .desc-val {
              color: var(--muted-strong);
            }

            .tags-val {
              color: #38bdf8;
              font-weight: 600;
            }

            .copy-package-btn {
              min-height: 46px;
              border: none;
              border-radius: 12px;
              background: linear-gradient(135deg, rgba(246, 92, 139, 0.15), rgba(139, 92, 246, 0.15));
              border: 1px solid rgba(246, 92, 139, 0.25);
              color: #ffffff;
              font-size: 13px;
              font-weight: 750;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              cursor: pointer;
              transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .copy-package-btn:hover {
              background: linear-gradient(135deg, rgba(246, 92, 139, 0.22), rgba(139, 92, 246, 0.22));
              border-color: rgba(246, 92, 139, 0.4);
              transform: translateY(-1px);
              box-shadow: 0 4px 20px rgba(246, 92, 139, 0.12);
            }

            .text-amber {
              color: #f59e0b;
            }

            .success-color {
              color: #10b981;
            }

            .download-message {
              margin: 0;
              color: var(--muted);
              font-size: 12px;
              text-align: center;
            }

            .download-message.error {
              color: #fca5a5;
            }

            .spin {
              animation: spin 1.1s linear infinite;
            }

            @media (max-width: 640px) {
              .export-overlay {
                align-items: flex-end;
                padding: 12px;
              }

              .export-window {
                max-height: 88vh;
                padding: 20px;
                border-radius: 18px 18px 14px 14px;
              }

              .export-header {
                gap: 14px;
              }

              .header-title {
                align-items: flex-start;
              }

              .download-btn,
              .link-btn,
              .copy-package-btn {
                min-height: 46px;
              }
            }

            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  );
}
