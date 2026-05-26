"use client";

import Link from "next/link";
import { ArrowLeft, Play } from "@phosphor-icons/react";

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-black pt-28 pb-24 md:pb-32">
      <div className="page-container max-w-5xl">
        <div className="section-heading mb-10 md:mb-12">
          <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-bold mb-8">
            <ArrowLeft weight="bold" /> Back to Engine
          </Link>
          <h1 className="section-title-lg text-white mb-4">Output Showcase</h1>
          <p className="section-copy max-w-2xl">Unedited, raw pipeline renders from our production environment. Zero manual adjustments made after FFmpeg processing.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
          
          {/* Demo 1 */}
          <div className="liquid-glass rounded-[22px] p-5 md:p-6 border-white/[0.07] flex flex-col gap-6">
            <div className="flex items-center justify-between">
               <div>
                 <h3 className="text-xl font-bold text-white font-outfit">Podcast Excerpt</h3>
                 <p className="text-sm text-zinc-500">Style: Cinematic Noir • 00:42</p>
               </div>
               <div className="px-3 py-1 bg-sky-500/10 text-sky-400 text-xs font-bold rounded-full border border-sky-500/20">
                 1080x1920
               </div>
            </div>
            
            {/* Split Video Container */}
            <div className="flex gap-4">
              <div className="flex-1 flex flex-col gap-2">
                <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest text-center">Raw 16:9 Input</div>
                <div className="aspect-video bg-zinc-900 rounded-lg border border-zinc-800 flex items-center justify-center relative group cursor-pointer overflow-hidden">
                   <Play size={32} className="text-white/50 group-hover:text-white transition-colors" weight="fill" />
                </div>
              </div>
              <div className="flex-[0.8] flex flex-col gap-2">
                <div className="text-xs font-mono text-sky-400 uppercase tracking-widest text-center">Output 9:16</div>
                <div className="aspect-[9/16] bg-zinc-900 rounded-lg border border-sky-500/30 shadow-[0_0_20px_rgba(14,165,233,0.1)] flex items-center justify-center relative group cursor-pointer overflow-hidden">
                   <Play size={32} className="text-white/50 group-hover:text-white transition-colors" weight="fill" />
                   <div className="absolute inset-x-0 bottom-8 text-center">
                     <span className="bg-black/80 px-2 py-1 text-white font-outfit font-black text-xs uppercase shadow-xl">GENERATED CAPTION</span>
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* Demo 2 */}
          <div className="liquid-glass rounded-[22px] p-5 md:p-6 border-white/[0.07] flex flex-col gap-6">
            <div className="flex items-center justify-between">
               <div>
                 <h3 className="text-xl font-bold text-white font-outfit">Gaming Stream</h3>
                 <p className="text-sm text-zinc-500">Style: Viral Edge • 00:28</p>
               </div>
               <div className="px-3 py-1 bg-sky-500/10 text-sky-400 text-xs font-bold rounded-full border border-sky-500/20">
                 1080x1920
               </div>
            </div>
            
            {/* Split Video Container */}
            <div className="flex gap-4">
              <div className="flex-1 flex flex-col gap-2">
                <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest text-center">Raw 16:9 Input</div>
                <div className="aspect-video bg-zinc-900 rounded-lg border border-zinc-800 flex items-center justify-center relative group cursor-pointer overflow-hidden">
                   <Play size={32} className="text-white/50 group-hover:text-white transition-colors" weight="fill" />
                </div>
              </div>
              <div className="flex-[0.8] flex flex-col gap-2">
                <div className="text-xs font-mono text-sky-400 uppercase tracking-widest text-center">Output 9:16</div>
                <div className="aspect-[9/16] bg-zinc-900 rounded-lg border border-sky-500/30 shadow-[0_0_20px_rgba(14,165,233,0.1)] flex items-center justify-center relative group cursor-pointer overflow-hidden">
                   <Play size={32} className="text-white/50 group-hover:text-white transition-colors" weight="fill" />
                   <div className="absolute inset-x-0 bottom-16 text-center">
                     <span className="bg-transparent text-yellow-400 font-outfit font-black text-xl uppercase drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] stroke-black">WAIT WHAT?!</span>
                   </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="mt-14 md:mt-16 text-center">
          <Link href="/#waitlist" className="btn-primary py-4 px-8 text-lg">
            Request Private Beta Access
          </Link>
        </div>
      </div>
    </main>
  );
}
