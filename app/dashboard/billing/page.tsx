"use client";

import React, { useState, useEffect } from "react";
import { Check, Sparkles, Loader2, CreditCard, Zap } from "lucide-react";
import { authenticatedFetch } from "@/lib/supabase";

interface UserInfo {
  email: string;
  tier: "free" | "pro";
  minutes_remaining: number;
  total_limit: number;
}

export default function BillingPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchUserInfo = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await authenticatedFetch(`${apiUrl}/api/me`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setUser(data);
        }
      } catch (err) {
        console.error("Failed to load user info:", err);
        if (!cancelled) setError("Failed to fetch account limits.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchUserInfo();
    return () => { cancelled = true; };
  }, []);

  const handleUpgrade = async () => {
    setUpgrading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await authenticatedFetch(`${apiUrl}/api/billing/create-checkout-session`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Could not initialize payment gateway. Please try again.");
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Failed to retrieve checkout session URL.");
      }
    } catch (err: unknown) {
      console.error("Upgrade error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please check your Stripe configurations.");
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted">
        <Loader2 className="spin" size={24} />
        <span>Syncing billing state...</span>
      </div>
    );
  }

  const isPro = user?.tier === "pro";
  const usedMinutes = user ? user.total_limit - user.minutes_remaining : 0;
  const progressPercent = user ? Math.min(100, (usedMinutes / user.total_limit) * 100) : 0;

  return (
    <div className="billing-container">
      {/* Title */}
      <section className="billing-hero mb-8">
        <h1 className="text-4xl font-extrabold font-outfit text-white tracking-wide flex items-center gap-3">
          <CreditCard className="text-accent-2" size={32} />
          Billing & Usage
        </h1>
        <p className="text-muted text-sm mt-2 max-w-lg">
          Manage your subscription plan, view limits, and optimize your video rendering speeds.
        </p>
      </section>

      {error && (
        <div className="error-banner mb-6">
          ⚠️ {error}
        </div>
      )}

      {/* Usage Overview Card */}
      <div className="glass p-6 rounded-2xl flex flex-col md:flex-row gap-6 justify-between items-start md:items-center relative overflow-hidden mb-8 border border-white/5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col gap-2 z-10 w-full md:w-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-muted/60">Current Tier</span>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold font-outfit text-white capitalize">
              {isPro ? "Stealth Pro Active" : "Free Ingest Plan"}
            </h2>
            <span className={`tier-badge ${user?.tier}`}>
              {user?.tier.toUpperCase()}
            </span>
          </div>
          <p className="text-muted text-xs font-mono mt-1 font-semibold">
            Registered account: {user?.email}
          </p>
        </div>

        <div className="w-full md:w-80 flex flex-col gap-2 z-10">
          <div className="flex justify-between text-xs font-bold text-muted/80">
            <span>PIPELINE MINUTES USED</span>
            <span className="text-white">{usedMinutes.toFixed(1)} / {user?.total_limit} MINS</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="text-[11px] text-muted text-right">
            Resets monthly · {user?.minutes_remaining.toFixed(1)} mins remaining
          </span>
        </div>
      </div>

      {/* Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-8">
        
        {/* Free Card */}
        <div className="glass p-8 rounded-2xl border border-white/5 flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold font-outfit text-white">Free Ingest</h3>
                <p className="text-xs text-muted mt-1">Standard video rendering</p>
              </div>
              <span className="text-2xl font-extrabold font-outfit text-white">$0<span className="text-xs text-muted font-normal">/mo</span></span>
            </div>
            
            <ul className="flex flex-col gap-3 mt-6 text-sm text-muted-strong">
              <li className="flex items-center gap-2.5">
                <Check size={16} className="text-success" />
                <span>15 minutes of pipeline video processing</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check size={16} className="text-success" />
                <span>Basic Hook Detection AI engine</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check size={16} className="text-success" />
                <span>9:16 Portrait export format</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check size={16} className="text-success" />
                <span>Default caption styles</span>
              </li>
            </ul>
          </div>
          
          <div className="mt-8">
            <button 
              disabled 
              className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-muted cursor-not-allowed"
            >
              {!isPro ? "Current Subscription" : "Standard Limit"}
            </button>
          </div>
        </div>

        {/* Pro Card */}
        <div className="glass p-8 rounded-2xl border border-accent/20 flex flex-col justify-between relative overflow-hidden bg-gradient-to-b from-accent/5 to-transparent">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-4 right-4 bg-accent/10 border border-accent/20 text-accent font-mono text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
            <Sparkles size={10} /> RECOMMENDED
          </div>
          
          <div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold font-outfit text-white flex items-center gap-2">
                  Stealth Pro
                  <Zap size={18} className="text-accent-3 fill-accent-3" />
                </h3>
                <p className="text-xs text-muted mt-1">Venture-grade computing scale</p>
              </div>
              <span className="text-2xl font-extrabold font-outfit text-white">$29<span className="text-xs text-muted font-normal">/mo</span></span>
            </div>

            <ul className="flex flex-col gap-3 mt-6 text-sm text-muted-strong font-semibold">
              <li className="flex items-center gap-2.5">
                <Check size={16} className="text-accent-2" />
                <span><strong>200 minutes</strong> of video pipeline time</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check size={16} className="text-accent-2" />
                <span>Priority GPU queues & 3x rendering speed</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check size={16} className="text-accent-2" />
                <span>All presets (16:9, 1:1, 9:16 portrait)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check size={16} className="text-accent-2" />
                <span>Exclusive premium typography templates</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check size={16} className="text-accent-2" />
                <span>AI Virality Hook Optimization (92+ index)</span>
              </li>
            </ul>
          </div>

          <div className="mt-8">
            {isPro ? (
              <button 
                disabled 
                className="w-full py-3 bg-accent/15 border border-accent/30 rounded-xl text-sm font-bold text-accent cursor-not-allowed"
              >
                Pro Tier Active
              </button>
            ) : (
              <button 
                onClick={handleUpgrade}
                disabled={upgrading}
                className="w-full py-3 glow-button rounded-xl text-sm font-extrabold text-black flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.98]"
              >
                {upgrading ? (
                  <>
                    <Loader2 className="spin" size={16} />
                    Redirecting to Stripe...
                  </>
                ) : (
                  <>
                    Upgrade to Stealth Pro
                    <Sparkles size={15} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>

      <style jsx>{`
        .billing-container {
          display: flex;
          flex-direction: column;
        }
        .progress-bar-container {
          width: 100%;
          height: 6px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.08);
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
        }
        .progress-bar-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, var(--accent-2), var(--accent));
          transition: width 0.4s ease;
        }
        .tier-badge {
          font-size: 11px;
          font-weight: 800;
          padding: 3px 9px;
          border-radius: 999px;
          border: 1px solid;
          letter-spacing: 0.05em;
        }
        .tier-badge.free {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.1);
          color: var(--muted);
        }
        .tier-badge.pro {
          background: rgba(124, 58, 237, 0.12);
          border-color: rgba(124, 58, 237, 0.3);
          color: #c084fc;
          box-shadow: 0 0 12px rgba(124, 58, 237, 0.15);
        }
        .error-banner {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          font-size: 13px;
          font-weight: 600;
          padding: 12px 16px;
          border-radius: 12px;
          text-align: center;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
