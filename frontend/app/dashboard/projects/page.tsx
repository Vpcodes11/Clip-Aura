export default function ComingSoon() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-5 text-center">
      <div className="logo-box scale-125 mb-2">P</div>
      <h1 className="text-3xl font-bold">Available in private beta</h1>
      <p className="text-muted max-w-md">
        This intelligence module is restricted during the private beta period. 
        Check back shortly as we expand the Clip Aura ecosystem.
      </p>
      <div className="glass px-4 py-2 text-xs font-mono text-accent rounded-full">
        STATUS: PRIVATE_BETA
      </div>
    </div>
  );
}
