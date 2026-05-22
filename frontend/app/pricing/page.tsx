"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle } from "@phosphor-icons/react";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-black pt-24 pb-32">
      <div className="page-container max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-bold mb-12">
          <ArrowLeft weight="bold" /> Back to Engine
        </Link>
        
        <div className="text-center mb-16">
          <div className="logo-box scale-150 mb-6 mx-auto">O</div>
          <h1 className="text-4xl md:text-5xl font-outfit font-bold text-white mb-4">
            Early Access Pricing
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            ClipAura is currently in closed development. Select your tier to request access to the cinematic rendering engine.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-20">
          {/* Free Tier */}
          <div className="liquid-glass rounded-3xl p-8 border border-white/5 flex flex-col relative overflow-hidden">
            <h3 className="text-2xl font-outfit font-bold text-white mb-2">Free</h3>
            <p className="text-zinc-400 mb-6">For creators testing the pipeline.</p>
            <div className="text-4xl font-outfit font-black text-white mb-8">$0<span className="text-lg text-zinc-500 font-normal">/mo</span></div>
            
            <ul className="flex flex-col gap-4 mb-8 flex-1">
              <li className="flex items-center gap-3 text-zinc-300">
                <CheckCircle className="text-sky-500" size={20} weight="fill" />
                15 minutes of rendering per month
              </li>
              <li className="flex items-center gap-3 text-zinc-300">
                <CheckCircle className="text-sky-500" size={20} weight="fill" />
                Standard output quality
              </li>
              <li className="flex items-center gap-3 text-zinc-300">
                <CheckCircle className="text-sky-500" size={20} weight="fill" />
                Waitlist access (delayed entry)
              </li>
            </ul>
            
            <Link href="/#waitlist" className="w-full text-center py-3 rounded-lg border border-zinc-700 text-white font-bold hover:bg-zinc-800 transition-colors">
              Join Waitlist
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="liquid-glass rounded-3xl p-8 border border-sky-500/30 relative overflow-hidden shadow-[0_0_40px_rgba(14,165,233,0.1)]">
            <div className="absolute top-0 right-0 bg-sky-500 text-black text-xs font-black uppercase tracking-widest py-1 px-4 rounded-bl-lg">
              Available in Private Beta
            </div>
            <h3 className="text-2xl font-outfit font-bold text-white mb-2">Pro</h3>
            <p className="text-zinc-400 mb-6">For professional cinematic output.</p>
            <div className="text-4xl font-outfit font-black text-white mb-8">$49<span className="text-lg text-zinc-500 font-normal">/mo</span></div>
            
            <ul className="flex flex-col gap-4 mb-8 flex-1">
              <li className="flex items-center gap-3 text-zinc-300">
                <CheckCircle className="text-sky-500" size={20} weight="fill" />
                1000 minutes of rendering per month
              </li>
              <li className="flex items-center gap-3 text-zinc-300">
                <CheckCircle className="text-sky-500" size={20} weight="fill" />
                Highest quality 4K renders
              </li>
              <li className="flex items-center gap-3 text-zinc-300">
                <CheckCircle className="text-sky-500" size={20} weight="fill" />
                Priority queue access
              </li>
            </ul>
            
            <Link href="/contact" className="w-full text-center py-3 rounded-lg bg-white text-black font-bold hover:bg-zinc-200 transition-colors">
              Request Pro Beta Access
            </Link>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-outfit font-bold text-white mb-8 text-center">Frequently Asked Questions</h2>
          <div className="flex flex-col gap-4">
            <div className="liquid-glass rounded-xl p-6 border border-white/5">
              <h4 className="text-white font-bold mb-2">When will I get access?</h4>
              <p className="text-zinc-400 text-sm leading-relaxed">We are slowly rolling out access to users on the waitlist. Pro beta requests are prioritized for onboarding.</p>
            </div>
            <div className="liquid-glass rounded-xl p-6 border border-white/5">
              <h4 className="text-white font-bold mb-2">Do you offer custom plans?</h4>
              <p className="text-zinc-400 text-sm leading-relaxed">Yes, for high-volume creator networks or agencies, please reach out via our contact page for enterprise licensing details.</p>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
