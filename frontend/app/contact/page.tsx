"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, EnvelopeSimple, Clock, MapPin } from "@phosphor-icons/react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setStatusMessage("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || "Could not send your message.");
      }
      setStatus("success");
      setStatusMessage(data.message || "Thanks. We'll get back to you within 24 hours.");
      setName("");
      setEmail("");
      setMessage("");
    } catch (error) {
      setStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Could not send your message.");
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] pt-28 pb-24 md:pb-32">
      <div className="page-container max-w-2xl">
        <div className="section-heading mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-bold mb-8">
            <ArrowLeft weight="bold" /> Back to Home
          </Link>
          <h1 className="section-title-lg text-white mb-4">Contact Us</h1>
          <p className="section-copy">
            Reach out for enterprise licensing, high-volume rendering, private beta access, or general inquiries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="liquid-glass rounded-[16px] p-5 border-white/[0.07]">
            <EnvelopeSimple size={22} className="text-sky-500 mb-3" />
            <h3 className="font-outfit font-semibold text-white text-sm mb-1">Email Support</h3>
            <a href="mailto:support@clipaura.com" className="text-zinc-400 text-xs hover:text-white transition-colors break-all">
              support@clipaura.com
            </a>
          </div>

          <div className="liquid-glass rounded-[16px] p-5 border-white/[0.07]">
            <Clock size={22} className="text-sky-500 mb-3" />
            <h3 className="font-outfit font-semibold text-white text-sm mb-1">Response Time</h3>
            <p className="text-zinc-400 text-xs">
              Typically within 24 hours on business days.
            </p>
          </div>

          <div className="liquid-glass rounded-[16px] p-5 border-white/[0.07]">
            <MapPin size={22} className="text-sky-500 mb-3" />
            <h3 className="font-outfit font-semibold text-white text-sm mb-1">Location</h3>
            <p className="text-zinc-400 text-xs">
              India
            </p>
          </div>
        </div>

        <div className="liquid-glass rounded-[22px] p-6 md:p-8 border-white/[0.07]">
          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Name</label>
              <input 
                type="text" 
                placeholder="Your Name" 
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder:text-zinc-700 focus:outline-none focus:border-sky-500 transition-colors"
                required
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Work Email</label>
              <input 
                type="email" 
                placeholder="director@studio.com" 
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder:text-zinc-700 focus:outline-none focus:border-sky-500 transition-colors"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Message</label>
              <textarea 
                placeholder="How can we help?" 
                rows={5}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder:text-zinc-700 focus:outline-none focus:border-sky-500 transition-colors resize-none"
                required
              ></textarea>
            </div>
            
            <button type="submit" className="w-full btn-primary py-4 mt-2" disabled={status === "loading"}>
              <EnvelopeSimple size={20} /> {status === "loading" ? "Sending..." : "Send Message"}
            </button>
            {statusMessage && (
              <p className={`text-xs text-center ${status === "error" ? "text-red-300" : "text-emerald-300"}`}>
                {statusMessage}
              </p>
            )}
            <p className="text-xs text-zinc-600 text-center mt-2">
              We won&apos;t spam you. Early access invites only.
            </p>
          </form>
        </div>

        <div className="mt-8 text-center">
          <p className="text-zinc-600 text-xs">
            ClipAura is operated by <span className="text-zinc-500 font-semibold">Vaibhav Nareshbhai Pamnani</span>
          </p>
        </div>
      </div>
    </main>
  );
}
