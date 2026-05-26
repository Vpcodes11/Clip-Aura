"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CreditCard, Loader2, RefreshCw } from "lucide-react";
import { authenticatedFetch } from "@/lib/supabase";

type BillingStatus = {
  tier: string;
  subscription_status: string;
  total_limit: number;
  used_minutes: number;
  minutes_remaining: number;
  rollover_credits: number;
  next_billing_date: string | null;
};

const PLAN_LABELS: Record<string, string> = {
  trial: "TRIAL",
  pro: "PRO",
  studio: "STUDIO",
  agency: "AGENCY",
};

export default function BillingPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCanceling, setIsCanceling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBilling = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await authenticatedFetch(`${apiUrl}/api/billing/status`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not load billing.");
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load billing.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const id = window.setTimeout(() => {
      loadBilling();
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const handleCancel = async () => {
    setIsCanceling(true);
    setMessage(null);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await authenticatedFetch(`${apiUrl}/api/billing/cancel-subscription`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Could not cancel subscription.");
      setMessage(data.message || "Subscription will cancel at period end.");
      await loadBilling();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel subscription.");
    } finally {
      setIsCanceling(false);
    }
  };

  const used = status?.used_minutes ?? 0;
  const limit = status?.total_limit ?? 0;
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div className="billing-page">
      <section className="billing-hero">
        <div>
          <h1>Billing</h1>
          <p>Review plan access, monthly usage, rollover credits, and subscription status.</p>
        </div>
        <button className="refresh-button" onClick={loadBilling} disabled={isLoading}>
          {isLoading ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
          Refresh
        </button>
      </section>

      {error && (
        <div className="billing-alert error">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {message && <div className="billing-alert success">{message}</div>}

      {isLoading && !status ? (
        <div className="billing-card loading"><Loader2 className="spin" size={18} /> Loading billing...</div>
      ) : (
        <div className="billing-grid">
          <article className="billing-card plan-card">
            <div className="card-topline">
              <CreditCard size={18} />
              Current Plan
            </div>
            <h2>{PLAN_LABELS[status?.tier || "trial"] || status?.tier}</h2>
            <p>Status: <strong>{status?.subscription_status || "unknown"}</strong></p>
            <p>{status?.next_billing_date ? `Renews ${new Date(status.next_billing_date).toLocaleDateString()}` : "No renewal date available."}</p>
          </article>

          <article className="billing-card usage-card">
            <div className="card-topline">Monthly Usage</div>
            <h2>{status?.minutes_remaining ?? 0} min remaining</h2>
            <div className="usage-track">
              <div className="usage-fill" style={{ width: `${percent}%` }} />
            </div>
            <p>{used} of {limit} plan minutes used.</p>
            <p>{status?.rollover_credits ?? 0} rollover credits available.</p>
          </article>

          <article className="billing-card actions-card">
            <div className="card-topline">Subscription Controls</div>
            <p>Cancellation keeps access active until the current paid period ends.</p>
            <button
              className="cancel-button"
              onClick={handleCancel}
              disabled={isCanceling || !status?.tier || status.tier === "trial" || !["active", "past_due"].includes(status.subscription_status)}
            >
              {isCanceling ? "Submitting..." : "Cancel at Period End"}
            </button>
          </article>
        </div>
      )}

      <style jsx>{`
        .billing-page {
          display: grid;
          gap: 22px;
        }
        .billing-hero {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: flex-start;
        }
        h1 {
          font-size: clamp(32px, 5vw, 48px);
          line-height: 1;
          margin-bottom: 8px;
        }
        .billing-hero p,
        .billing-card p {
          color: var(--muted);
          line-height: 1.55;
        }
        .refresh-button,
        .cancel-button {
          min-height: 42px;
          border-radius: 12px;
          border: 1px solid var(--hairline);
          padding: 0 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          font-weight: 800;
          background: rgba(255,255,255,0.05);
          color: #ffffff;
        }
        .billing-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }
        .billing-card {
          border: 1px solid var(--hairline);
          border-radius: 20px;
          padding: 24px;
          background: var(--panel-bg);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 18px 60px rgba(0,0,0,0.22);
        }
        .billing-card.loading {
          min-height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: var(--muted);
        }
        .card-topline {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--muted);
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 18px;
        }
        .billing-card h2 {
          font-size: 28px;
          margin-bottom: 14px;
        }
        .usage-track {
          height: 8px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          margin: 18px 0;
        }
        .usage-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #06b6d4, #38bdf8);
        }
        .billing-alert {
          border-radius: 14px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
        }
        .billing-alert.error {
          border: 1px solid rgba(239, 68, 68, 0.24);
          background: rgba(239, 68, 68, 0.08);
          color: #fca5a5;
        }
        .billing-alert.success {
          border: 1px solid rgba(16, 185, 129, 0.24);
          background: rgba(16, 185, 129, 0.08);
          color: #a7f3d0;
        }
        .cancel-button {
          width: 100%;
          margin-top: 20px;
        }
        .cancel-button:disabled,
        .portal-button:disabled,
        .refresh-button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }
        @media (max-width: 920px) {
          .billing-grid {
            grid-template-columns: 1fr;
          }
          .billing-hero {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
