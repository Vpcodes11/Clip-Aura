"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="dashboard-error">
      <div className="glass error-panel">
        <AlertTriangle size={28} />
        <h1>Dashboard error</h1>
        <p>{error.message || "The dashboard could not finish rendering."}</p>
        <button className="secondary-btn" onClick={reset}>
          <RotateCcw size={16} />
          Try again
        </button>
      </div>
    </div>
  );
}
