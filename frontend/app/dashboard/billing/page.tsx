"use client";

import { Sparkles } from "lucide-react";

export default function ComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center">
      <div className="logo-box scale-150 mb-4">C</div>
      <h1 className="text-3xl font-bold">Billing System Calibration</h1>
      <p className="text-muted max-w-md">
        The billing and subscription dashboard is currently being calibrated for peak performance. 
        Check back shortly as we expand the Clipaura ecosystem.
      </p>
      <div className="glass px-4 py-2 text-xs font-mono text-accent">
        STATUS: INITIALIZING_V2
      </div>
    </div>
  );
}
