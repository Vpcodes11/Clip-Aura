"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle, Sparkle } from "@phosphor-icons/react";

const TIERS = [
  {
    name: "Trial",
    price: "$0",
    period: "one-time",
    minutes: "60 minutes",
    subtitle: "Try ClipAura free for 14 days.",
    features: [
      "60 one-time rendering minutes",
      "Watermarked exports",
      "1080p output quality",
      "Expires after 14 days",
    ],
    cta: "Start Free Trial",
    href: "/login",
    featured: false,
    highlight: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mo",
    minutes: "240 mins/month",
    subtitle: "For serious solo creators.",
    features: [
      "240 minutes of rendering per month",
      "1080p export quality",
      "Standard brand kits",
      "No watermark",
      "Email support",
    ],
    cta: "Subscribe to Pro",
    href: "/login",
    featured: true,
    highlight: false,
  },
  {
    name: "Studio",
    price: "$69",
    period: "/mo",
    minutes: "600 mins/month",
    subtitle: "For professional media teams.",
    features: [
      "600 minutes of rendering per month",
      "4K export quality",
      "Premium cinematic templates",
      "Priority GPU rendering",
      "Priority support",
    ],
    cta: "Subscribe to Studio",
    href: "/login",
    featured: false,
    highlight: true,
  },
  {
    name: "Agency",
    price: "$149",
    period: "/mo",
    minutes: "1500 mins/month",
    subtitle: "For agencies and media networks.",
    features: [
      "1500 minutes of rendering per month",
      "Team seats",
      "White-label review links",
      "XML / EDL export",
      "Dedicated support",
    ],
    cta: "Subscribe to Agency",
    href: "/login",
    featured: false,
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#050505] pt-28 pb-24 md:pb-32">
      <div className="page-container max-w-6xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-bold mb-10"
        >
          <ArrowLeft weight="bold" /> Back to Engine
        </Link>

        <div className="section-heading centered mb-12 md:mb-14">
          <h1 className="section-title-lg text-white mb-4">
            Cinematic Pricing
          </h1>
          <p className="section-copy max-w-2xl mx-auto">
            ClipAura is currently in closed development. Select your tier to request access to the cinematic rendering engine.
          </p>
        </div>

        {/* 4-tier grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto mb-12">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`liquid-glass rounded-[22px] p-6 flex flex-col relative overflow-hidden min-h-[390px] ${
                tier.featured
                  ? "border-sky-500/30 shadow-[0_0_34px_rgba(14,165,233,0.08)]"
                  : tier.highlight
                  ? "border-sky-500/20 shadow-[0_0_28px_rgba(14,165,233,0.055)]"
                  : "border-white/[0.07]"
              }`}
            >
              {tier.highlight && (
                <div className="absolute top-0 right-0 bg-white text-black text-[10px] font-black uppercase py-1.5 px-4 rounded-bl-lg">
                  Most Popular
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-xl font-outfit font-bold text-white mb-2">{tier.name}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{tier.subtitle}</p>
              </div>
              <div className="mb-1 mt-auto">
                <span className="text-3xl font-outfit font-black text-white">{tier.price}</span>
                <span className="text-sm text-zinc-500 font-normal ml-1">{tier.period}</span>
              </div>
              <p className="text-xs text-sky-400 font-bold mb-6">{tier.minutes}</p>

              <ul className="flex flex-col gap-3 mb-7">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-zinc-400 text-sm">
                    <CheckCircle className="text-sky-500 mt-0.5 shrink-0" size={16} weight="fill" />
                    {feat}
                  </li>
                ))}
              </ul>

              <Link
                href={tier.href}
                className={`mt-auto w-full min-h-11 inline-flex items-center justify-center rounded-xl font-bold text-sm transition-colors ${
                  tier.featured
                    ? "bg-white text-black hover:bg-zinc-200"
                  : tier.highlight
                    ? "border border-sky-500/35 text-white bg-sky-500/10 hover:bg-sky-500/15"
                    : "border border-zinc-700 text-white hover:bg-zinc-800"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Annual savings strip */}
        <div className="max-w-3xl mx-auto mb-5">
          <div className="liquid-glass rounded-[20px] p-6 md:p-7 border-sky-500/20 text-center">
            <p className="text-white font-bold text-lg mb-2">
              <Sparkle className="inline text-sky-400 mr-1" size={18} /> Save 20% with Annual Billing
            </p>
            <p className="text-zinc-400 text-sm">
              Pay yearly and get 2 months of rollover minutes on us. Available on Pro, Studio, and Agency plans.
            </p>
          </div>
        </div>

        {/* Credit packs */}
        <div className="max-w-3xl mx-auto mb-14">
          <div className="liquid-glass rounded-[20px] p-6 md:p-7 border-white/[0.07]">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-white font-bold text-lg mb-2">Need extra minutes?</h3>
                <p className="text-zinc-400 text-sm leading-relaxed max-w-xl">
              Credit packs give you 60 rollover minutes for $15. Minutes never expire while your subscription is active.
                </p>
              </div>
              <Link
                href="/login"
                className="btn-secondary shrink-0"
              >
                Purchase Credits <ArrowLeft className="rotate-180" size={14} weight="bold" />
              </Link>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-outfit font-bold text-white mb-8 text-center">Frequently Asked Questions</h2>
          <div className="grid gap-4">
            <div className="liquid-glass rounded-[18px] p-6 border-white/[0.07]">
              <h4 className="text-white font-bold mb-2">When will I get access?</h4>
              <p className="text-zinc-400 text-sm leading-relaxed">
                We are slowly rolling out access during private beta. Join the waitlist to secure your spot.
              </p>
            </div>
            <div className="liquid-glass rounded-[18px] p-6 border-white/[0.07]">
              <h4 className="text-white font-bold mb-2">What happens when I run out of minutes?</h4>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Your current render will finish without interruption. After that, you&apos;ll see an upgrade nudge — no hard mid-workflow blocks. Credit packs are available anytime.
              </p>
            </div>
            <div className="liquid-glass rounded-[18px] p-6 border-white/[0.07]">
              <h4 className="text-white font-bold mb-2">Do you offer custom plans?</h4>
              <p className="text-zinc-400 text-sm leading-relaxed">
                For high-volume creator networks or agencies needing more than 1500 minutes per month, reach out via our contact page for enterprise licensing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
