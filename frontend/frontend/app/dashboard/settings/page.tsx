"use client";

export default function SettingsPage() {
  return (
    <>
      <div className="placeholder-wrapper">
        <div className="placeholder-card">
          <div className="placeholder-icon">🔧</div>
          <h2>System Calibration</h2>
          <p>Settings and configuration modules are currently being deployed. Check back shortly as we expand the Clip Aura ecosystem.</p>
          <div className="status-chip">STATUS: INITIALIZING_V2</div>
        </div>
      </div>
      <style jsx>{`
        .placeholder-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          padding: 24px;
        }
        .placeholder-card {
          width: 100%;
          max-width: 480px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 40px 32px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          background: rgba(10, 13, 22, 0.78);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 18px 60px rgba(0, 0, 0, 0.22);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }
        .placeholder-icon {
          font-size: 2.5rem;
        }
        h2 {
          font-family: var(--font-outfit);
          font-size: 24px;
          color: #ffffff;
        }
        p {
          color: var(--muted);
          line-height: 1.55;
          max-width: 42ch;
        }
        .status-chip {
          margin-top: 8px;
          border: 1px solid rgba(124, 58, 237, 0.2);
          border-radius: 999px;
          padding: 6px 14px;
          background: rgba(124, 58, 237, 0.08);
          color: var(--accent);
          font-family: ui-monospace, monospace;
          font-size: 12px;
          font-weight: 800;
        }
      `}</style>
    </>
  );
}
