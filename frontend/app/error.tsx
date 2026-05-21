"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="error-boundary">
      <div className="glass error-panel">
        <AlertTriangle size={28} />
        <h1>Something went wrong</h1>
        <p>{error.message || "The app hit an unexpected error. Try reloading this view."}</p>
        <button className="secondary-btn" onClick={reset}>
          <RotateCcw size={16} />
          Try again
        </button>
      </div>
    </main>
  );
}
