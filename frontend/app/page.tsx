"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Play, ArrowRight, VideoCamera, Scissors, Waveform, Export, LockKey, EnvelopeSimple } from "@phosphor-icons/react";

const springTransition = { type: "spring", stiffness: 100, damping: 20 } as const;

export default function Home() {
  return (
    <main className="pt-20 min-h-[100dvh] flex flex-col bg-black">
      {/* Hero Section - Asymmetric Left Aligned */}
      <section className="relative min-h-[85dvh] flex items-center pt-24 pb-16 overflow-hidden">
        <div className="page-container relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          
          {/* Left Text Column */}
          <div className="max-w-xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springTransition}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
              <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">Early Access V1.0</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.1 }}
              className="text-6xl md:text-8xl tracking-tighter leading-[0.9] text-white mb-8"
            >
              Cinematic Shorts. <br/>
              <span className="text-zinc-600">Built for Creators.</span>
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

          {/* Right Asset Column - Liquid Glass Representation */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...springTransition, delay: 0.4 }}
            className="hidden md:flex justify-end relative"
          >
            <div className="w-full max-w-[500px] aspect-[4/5] liquid-glass-strong rounded-[24px] p-6 relative flex flex-col gap-4 overflow-hidden group">
              {/* Fake processing UI */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="text-xs font-mono text-zinc-500">PROCESSING: 04:12:00.RAW</div>
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
                  <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
                </div>
              </div>
              <div className="flex-1 bg-black/40 rounded-xl border border-white/5 relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-luminosity transition-transform duration-1000 group-hover:scale-105"></div>
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
            {/* Ambient glow behind card */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-sky-500/20 blur-[100px] -z-10 rounded-full"></div>
          </motion.div>
          
        </div>
      </section>

      {/* Features Section - Bento Grid */}
      <section id="features" className="py-32 relative border-t border-white/5">
        <div className="page-container">
          <div className="mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">Precision Engineering</h2>
            <p className="text-zinc-400 max-w-xl">We stripped away the generic AI toys to build a production tool that respects your workflow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1 - Large */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="liquid-glass rounded-[24px] p-8 md:col-span-2 flex flex-col justify-between min-h-[340px] group cursor-default"
            >
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center mb-8">
                <Scissors size={24} className="text-sky-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Intelligent Reframing</h3>
                <p className="text-zinc-400 max-w-md">Our deterministic face tracking keeps the subject locked dead center. It doesn't guess; it calculates the exact crop coordinates for 9:16 perfection.</p>
              </div>
              <div className="absolute top-8 right-8 w-48 h-48 border border-white/5 rounded-2xl bg-zinc-950/50 overflow-hidden hidden sm:flex items-center justify-center">
                 <div className="w-16 h-32 border-2 border-sky-500/50 rounded-lg animate-pulse shadow-[0_0_20px_rgba(14,165,233,0.2)]"></div>
              </div>
            </motion.div>

            {/* Feature 2 - Small */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="liquid-glass rounded-[24px] p-8 flex flex-col justify-between min-h-[340px]"
            >
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center mb-8">
                <Waveform size={24} className="text-sky-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Cinematic Typography</h3>
                <p className="text-zinc-400">Hardcoded font fallbacks, precise stroke rendering, and exact ASS subtitle timings. Zero jitter.</p>
              </div>
            </motion.div>

            {/* Feature 3 - Small */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="liquid-glass rounded-[24px] p-8 flex flex-col justify-between min-h-[340px]"
            >
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center mb-8">
                <LockKey size={24} className="text-sky-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Stealth Privacy</h3>
                <p className="text-zinc-400">Your raw footage is sandboxed. We don't train on your clips. We don't post to your accounts.</p>
              </div>
            </motion.div>

            {/* Feature 4 - Large */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="liquid-glass rounded-[24px] p-8 md:col-span-2 flex flex-col justify-between min-h-[340px]"
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

      {/* Demo Showcase Section */}
      <section id="demo" className="py-32 relative bg-zinc-950 border-y border-white/5">
        <div className="page-container flex flex-col md:flex-row gap-16 items-center">
          <div className="flex-1 w-full relative">
            <div className="aspect-video bg-black rounded-2xl border border-zinc-800 overflow-hidden relative shadow-2xl">
              <div className="absolute inset-0 flex items-center justify-center text-zinc-700 font-mono text-sm border-b border-zinc-800/50">
                 [Raw Video Input: 4K Landscape]
              </div>
              <div className="absolute bottom-0 inset-x-0 h-1/3 bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800 flex flex-col justify-end p-4">
                 <div className="w-full h-8 bg-zinc-800/50 rounded flex gap-1 p-1">
                   <div className="w-1/4 h-full bg-sky-500/20 rounded border border-sky-500/30"></div>
                   <div className="w-1/6 h-full bg-sky-500/20 rounded border border-sky-500/30"></div>
                   <div className="w-1/3 h-full bg-sky-500/50 rounded border border-sky-500/80 shadow-[0_0_10px_rgba(14,165,233,0.3)]"></div>
                 </div>
                 <div className="mt-2 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Identifying Hook Sequences...</div>
              </div>
            </div>
          </div>
          <div className="flex-1 max-w-lg">
            <h2 className="text-4xl font-bold text-white mb-6">Observe the Pipeline</h2>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              ClipAura doesn't just cut randomly. It analyzes the waveform, detects the high-retention moments, and calculates a dynamic crop path that follows the subject seamlessly from 16:9 to 9:16.
            </p>
            <div className="space-y-4">
               <div className="flex items-center gap-4 text-zinc-300">
                 <div className="w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center border border-sky-500/30 text-xs font-bold text-sky-400">1</div>
                 <span>Audio-text synchronization</span>
               </div>
               <div className="flex items-center gap-4 text-zinc-300">
                 <div className="w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center border border-sky-500/30 text-xs font-bold text-sky-400">2</div>
                 <span>Subject detection & padding</span>
               </div>
               <div className="flex items-center gap-4 text-zinc-300">
                 <div className="w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center border border-sky-500/30 text-xs font-bold text-sky-400">3</div>
                 <span>Cinematic subtitle burning</span>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser & Waitlist */}
      <section id="pricing" className="py-32 relative">
        <div className="page-container max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Elite Architecture. Closed Beta.</h2>
          <p className="text-zinc-400 mb-16 max-w-xl mx-auto">
            We are currently restricting access to maintain render pipeline speeds for our existing creators. 
          </p>
          
          <div className="liquid-glass rounded-3xl p-1 md:p-1 max-w-md mx-auto">
             <div className="bg-zinc-950/80 rounded-[20px] p-8 md:p-10 border border-white/5">
                <div className="text-xl font-bold text-white mb-2">Creator Edition</div>
                <div className="text-5xl font-outfit tracking-tighter text-white mb-6">$49<span className="text-lg text-zinc-500 font-body tracking-normal">/mo</span></div>
                <ul className="text-left space-y-4 mb-10 text-zinc-400 text-sm">
                  <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div> 100 High-Fidelity Renders</li>
                  <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div> 4K Processing Priority</li>
                  <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div> Private Asset Sandbox</li>
                </ul>
                <Link href="#waitlist" className="w-full btn-secondary py-4 font-bold text-white hover:bg-white/10">
                  Request Invitation
                </Link>
             </div>
          </div>
        </div>
      </section>

      {/* Contact / Waitlist Form */}
      <section id="waitlist" className="py-32 border-t border-white/5 bg-zinc-950">
        <div className="page-container max-w-3xl">
          <div className="flex flex-col items-center text-center mb-12">
            <EnvelopeSimple size={48} className="text-zinc-600 mb-6" />
            <h2 className="text-3xl font-bold text-white mb-4">Join the Waitlist</h2>
            <p className="text-zinc-400">Leave your email to be notified when capacity opens.</p>
          </div>
          
          <form className="max-w-md mx-auto flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Work Email</label>
              <input 
                type="email" 
                placeholder="director@studio.com" 
                className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder:text-zinc-700 focus:outline-none focus:border-sky-500 transition-colors"
                required
              />
            </div>
            <button type="submit" className="w-full btn-primary py-3 mt-2">
              Secure Position
            </button>
            <p className="text-xs text-zinc-600 text-center mt-4">We won't spam you. Early access invites only.</p>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 text-center text-zinc-600 text-sm font-medium">
        <div className="page-container">
          &copy; {new Date().getFullYear()} ClipAura. Designed for high-stakes execution.
        </div>
      </footer>
    </main>
  );
}
