"use client";

import { useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Play, ArrowRight, Scissors, Waveform, Export, LockKey, EnvelopeSimple } from "@phosphor-icons/react";

const springTransition = { type: "spring", stiffness: 100, damping: 20 } as const;

const WAVEFORM_BARS = 40;
const WAVEFORM_DATA = Array.from({ length: WAVEFORM_BARS }, (_, i) =>
  parseFloat((6 + Math.sin(i * 0.5) * 16).toFixed(4))
);

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    const elements = node.querySelectorAll(".reveal, .reveal-stagger");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return ref;
}

export default function Home() {
  const revealRef = useScrollReveal();
  const pipelineRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: pipelineRef,
    offset: ["start end", "end start"],
  });

  const pipelineOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.6, 1, 1, 0.6]);
  const pipelineScale = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.98, 1, 1, 0.98]);

  return (
    <main ref={revealRef} className="pt-20 min-h-[100dvh] flex flex-col bg-[#050505]">
      {/* ================================================================
          HERO — asymmetric left-aligned, cinematic entrance
          ================================================================ */}
      <section className="relative min-h-[90dvh] flex items-center py-24 md:py-32 overflow-hidden">
        <div className="page-container relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">

          {/* Left Text Column */}
          <div className="max-w-xl reveal">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springTransition}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75 animate-ping"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500"></span>
              </span>
              <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">Early Access V1.0</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.1 }}
              className="text-6xl md:text-8xl tracking-tighter leading-[0.9] text-white mb-8"
            >
              Cinematic Shorts.{" "}
              <span className="text-zinc-600 inline-block">Built for Creators.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.2 }}
              className="text-lg text-zinc-400 max-w-md leading-relaxed mb-10"
            >
              The first AI pipeline designed for high-stakes video production. Process raw footage into TikToks and Reels with precise subtitles, intelligent reframing, and complete privacy.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.3 }}
              className="flex flex-wrap items-center gap-4"
            >
              <Link href="#waitlist" className="btn-primary">
                Join Early Access
              </Link>
              <Link href="#demo" className="btn-secondary">
                <Play weight="fill" /> Watch Pipeline
              </Link>
            </motion.div>
          </div>

          {/* Right Asset Column — liquid glass UI representation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...springTransition, delay: 0.35 }}
            className="hidden md:flex justify-center lg:justify-end relative"
          >
            <div className="w-full max-w-[480px] aspect-[4/5] liquid-glass-strong glass-rim rounded-[24px] p-6 relative flex flex-col gap-4 overflow-hidden group">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="text-xs font-mono text-zinc-500 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500/60"></span>
                  PROCESSING: 04:12:00.RAW
                </div>
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
                  <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
                </div>
              </div>
              <div className="flex-1 bg-black/40 rounded-xl border border-white/5 relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-35 mix-blend-luminosity transition-transform duration-[1200ms] group-hover:scale-105"></div>
                <div className="scanline"></div>
                <div className="absolute inset-x-0 bottom-8 flex justify-center">
                  <div className="liquid-glass px-6 py-3 rounded-lg text-2xl font-black tracking-tight uppercase shadow-2xl">
                    <span className="text-white">THIS FEELS </span>
                    <span className="text-sky-400">EDITED</span>
                  </div>
                </div>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-sky-500"
                  animate={{ width: ["0%", "100%", "0%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
              </div>
            </div>
            {/* Ambient illumination behind card */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-sky-500/10 blur-[120px] -z-10 rounded-full"></div>
          </motion.div>

        </div>
      </section>

      {/* ================================================================
          FEATURES — Bento grid, staggered reveals, hover depth
          ================================================================ */}
      <section id="features" className="relative py-24 md:py-32 border-t border-white/[0.08]">
        <div className="page-container">
          <div className="mb-16 md:mb-20 reveal">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-5">Precision Engineering</h2>
            <p className="text-zinc-400 max-w-xl text-lg leading-relaxed">We stripped away the generic AI toys to build a production tool that respects your workflow.</p>
          </div>

          <div className="reveal-stagger grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">

            {/* Feature 1 — Large */}
            <motion.div
              whileHover={{ y: -4 }}
              className="liquid-glass glass-rim rounded-[24px] p-8 md:col-span-2 flex flex-col justify-between min-h-[340px] group cursor-default relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center mb-8">
                <Scissors size={24} className="text-sky-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Intelligent Reframing</h3>
                <p className="text-zinc-400 max-w-md">Our deterministic face tracking keeps the subject locked dead center. It doesn&apos;t guess; it calculates the exact crop coordinates for 9:16 perfection.</p>
              </div>
              {/* Decorative grid overlay */}
              <div className="absolute top-8 right-8 w-48 h-48 border border-white/5 rounded-2xl bg-zinc-950/50 overflow-hidden hidden sm:flex items-center justify-center">
                <div className="w-16 h-32 border-2 border-sky-500/40 rounded-lg animate-pulse shadow-[0_0_30px_rgba(14,165,233,0.15)]"></div>
              </div>
            </motion.div>

            {/* Feature 2 — Small */}
            <motion.div
              whileHover={{ y: -4 }}
              className="liquid-glass glass-rim rounded-[24px] p-8 flex flex-col justify-between min-h-[340px]"
            >
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center mb-8">
                <Waveform size={24} className="text-sky-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Cinematic Typography</h3>
                <p className="text-zinc-400">Hardcoded font fallbacks, precise stroke rendering, and exact ASS subtitle timings. Zero jitter.</p>
              </div>
            </motion.div>

            {/* Feature 3 — Small */}
            <motion.div
              whileHover={{ y: -4 }}
              className="liquid-glass glass-rim rounded-[24px] p-8 flex flex-col justify-between min-h-[340px]"
            >
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center mb-8">
                <LockKey size={24} className="text-sky-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Stealth Privacy</h3>
                <p className="text-zinc-400">Your raw footage is sandboxed. We don&apos;t train on your clips. We don&apos;t post to your accounts.</p>
              </div>
            </motion.div>

            {/* Feature 4 — Large */}
            <motion.div
              whileHover={{ y: -4 }}
              className="liquid-glass glass-rim rounded-[24px] p-8 md:col-span-2 flex flex-col justify-between min-h-[340px]"
            >
              <div className="flex justify-between items-start mb-8">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center">
                  <Export size={24} className="text-sky-400" />
                </div>
                <div className="flex gap-2">
                  <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-xs font-mono text-zinc-300">1080x1920</div>
                  <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-xs font-mono text-zinc-300">60FPS</div>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Creator-Native Output</h3>
                <p className="text-zinc-400 max-w-md mb-6">Generates mathematically perfect MP4s ready for upload. No watermarks. No compressed artifacts. Pure FFmpeg hardware acceleration.</p>
                <Link href="#waitlist" className="inline-flex items-center gap-2 text-white font-bold text-sm hover:text-sky-400 transition-colors">
                  Request Demo <ArrowRight size={16} />
                </Link>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ================================================================
          DEMO / PIPELINE — computational atmosphere, animated processor
          ================================================================ */}
      <section id="demo" ref={pipelineRef} className="relative py-24 md:py-32 bg-[#07090c] border-y border-white/[0.08] overflow-hidden" style={{ position: "relative" }}>
        <motion.div style={{ opacity: pipelineOpacity, scale: pipelineScale }} className="page-container flex flex-col lg:flex-row gap-14 lg:gap-24 items-center">
          <div className="flex-1 w-full relative">
            <div className="aspect-video bg-black rounded-2xl border border-zinc-800 overflow-hidden relative shadow-2xl">
              <div className="scanline"></div>
              <div className="absolute inset-0 flex items-center justify-center text-zinc-700 font-mono text-sm">
                <div className="flex flex-col items-center gap-3">
                  <span className="text-xs tracking-[0.3em] uppercase text-zinc-600">[Raw Video Input: 4K Landscape]</span>
                  {/* Waveform visualization — computational feel */}
                  <div className="flex items-end gap-[1px] h-10">
                    {WAVEFORM_DATA.map((h, i) => (
                      <div
                        key={i}
                        className="waveform-bar"
                        style={{ animationDelay: `${(i * 0.04).toFixed(2)}s`, height: `${h}px` }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 inset-x-0 h-1/3 bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800 flex flex-col justify-end p-4">
                <div className="w-full h-8 bg-zinc-800/50 rounded flex gap-1 p-1">
                  <div className="w-1/4 h-full bg-sky-500/20 rounded border border-sky-500/30"></div>
                  <div className="w-1/6 h-full bg-sky-500/20 rounded border border-sky-500/30"></div>
                  <div className="w-1/3 h-full bg-sky-500/50 rounded border border-sky-500/80 shadow-[0_0_10px_rgba(14,165,233,0.3)]"></div>
                </div>
                <div className="mt-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-sky-500/60 animate-pulse"></span>
                  Identifying Hook Sequences...
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 max-w-lg lg:pl-8 reveal">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Observe the Pipeline</h2>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              ClipAura doesn&apos;t just cut randomly. It analyzes the waveform, detects the high-retention moments, and calculates a dynamic crop path that follows the subject seamlessly from 16:9 to 9:16.
            </p>
            <div className="space-y-5">
              {[
                "Audio-text synchronization",
                "Subject detection & padding",
                "Cinematic subtitle burning",
              ].map((step, i) => (
                <div key={step} className="flex items-center gap-4 text-zinc-300 group/item">
                  <div className="w-7 h-7 rounded-full bg-sky-500/10 flex items-center justify-center border border-sky-500/20 text-xs font-bold text-sky-400 group-hover/item:bg-sky-500/20 transition-colors">
                    {i + 1}
                  </div>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ================================================================
          PRICING & WAITLIST — side-by-side cards, equal weight
          ================================================================ */}
      <section
        id="waitlist"
        className="relative border-t border-white/5 bg-zinc-950/80 py-24 md:py-32"
      >
        <div className="page-container">
          <div className="text-center mb-16 reveal">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5">Elite Architecture. Closed Beta.</h2>
            <p className="text-zinc-400 max-w-xl mx-auto text-lg leading-relaxed">
              We are currently restricting access to maintain render pipeline speeds for our existing creators.
            </p>
          </div>

          <div className="reveal-stagger grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 max-w-4xl mx-auto">

            {/* Creator Edition Card */}
            <div className="liquid-glass glass-rim flex h-full flex-col rounded-3xl p-[3px]">
              <div className="flex min-h-[420px] flex-1 flex-col rounded-[22px] border border-white/5 bg-zinc-950/80 p-8 md:p-10">
                <div className="text-lg font-bold text-white mb-2">Creator Edition</div>
                <div className="text-5xl font-outfit tracking-tighter text-white mb-6">
                  $49<span className="text-lg text-zinc-500 font-body tracking-normal">/mo</span>
                </div>
                <ul className="text-left space-y-4 mb-10 text-zinc-400 text-sm flex-1">
                  {["100 High-Fidelity Renders", "4K Processing Priority", "Private Asset Sandbox"].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="#waitlist"
                  className="w-full flex justify-center btn-secondary py-4 font-bold text-white hover:bg-white/10"
                >
                  Request Invitation
                </Link>
              </div>
            </div>

            {/* Waitlist Card */}
            <div className="liquid-glass glass-rim flex h-full flex-col rounded-3xl p-[3px]">
              <div className="flex min-h-[420px] flex-1 flex-col rounded-[22px] border border-white/5 bg-zinc-950/80 p-8 md:p-10">
                <div className="flex items-center gap-4 mb-4">
                  <EnvelopeSimple size={32} className="text-zinc-500" />
                  <h3 className="text-2xl font-bold text-white">Join the Waitlist</h3>
                </div>
                <p className="text-zinc-400 text-sm mb-8 text-left">
                  Leave your email to be notified when capacity opens.
                </p>

                <form className="flex flex-col gap-4 flex-1 justify-end">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1 text-left">Work Email</label>
                    <input
                      type="email"
                      placeholder="director@studio.com"
                      className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder:text-zinc-700 focus:outline-none focus:border-sky-500 transition-colors"
                      required
                    />
                  </div>
                  <button type="submit" className="w-full btn-primary py-4 font-bold mt-2">
                    Secure Position
                  </button>
                  <p className="text-xs text-zinc-600 text-center mt-2">We won&apos;t spam you. Early access invites only.</p>
                </form>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================================================================
          FOOTER — minimal, anchored
          ================================================================ */}
      <footer className="border-t border-white/5 py-12 md:py-16 text-center text-zinc-600 text-sm font-medium">
        <div className="page-container">
          &copy; {new Date().getFullYear()} ClipAura. Designed for high-stakes execution.
        </div>
      </footer>
    </main>
  );
}
