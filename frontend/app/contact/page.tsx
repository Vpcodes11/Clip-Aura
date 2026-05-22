"use client";

import Link from "next/link";
import { ArrowLeft, EnvelopeSimple } from "@phosphor-icons/react";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-black pt-24 pb-32">
      <div className="page-container max-w-2xl">
        <div className="mb-12">
          <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-bold mb-8">
            <ArrowLeft weight="bold" /> Back to Engine
          </Link>
          <h1 className="text-4xl md:text-5xl font-outfit font-bold text-white mb-4">Contact</h1>
          <p className="text-zinc-400 text-lg">Inquiries regarding enterprise licensing, high-volume rendering, or private beta access.</p>
        </div>

        <div className="liquid-glass rounded-2xl p-8 border border-white/5">
          <form className="flex flex-col gap-6" onSubmit={(e) => { e.preventDefault(); alert("Thanks for reaching out. We will get back to you shortly."); }}>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Name</label>
              <input 
                type="text" 
                placeholder="Your Name" 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder:text-zinc-700 focus:outline-none focus:border-sky-500 transition-colors"
                required
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Work Email</label>
              <input 
                type="email" 
                placeholder="director@studio.com" 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder:text-zinc-700 focus:outline-none focus:border-sky-500 transition-colors"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Message</label>
              <textarea 
                placeholder="How can we help?" 
                rows={5}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder:text-zinc-700 focus:outline-none focus:border-sky-500 transition-colors resize-none"
                required
              ></textarea>
            </div>
            
            <button type="submit" className="w-full btn-primary py-4 mt-2">
              <EnvelopeSimple size={20} /> Send Message
            </button>
            <p className="text-xs text-zinc-600 text-center mt-2">We won't spam you. Early access invites only.</p>
          </form>
        </div>
      </div>
    </main>
  );
}
