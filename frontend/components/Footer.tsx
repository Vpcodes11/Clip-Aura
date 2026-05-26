import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t muted-rule bg-[#050505]">
      <div className="page-container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          <div>
            <h3 className="font-outfit font-bold text-white text-sm tracking-widest uppercase mb-4">ClipAura</h3>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
              AI-powered cinematic clipping for creators who demand precision, privacy, and performance.
            </p>
          </div>

          <div>
            <h3 className="font-outfit font-bold text-white text-sm tracking-widest uppercase mb-4">Legal</h3>
            <div className="flex flex-col gap-3">
              <Link href="/privacy-policy" className="text-zinc-400 hover:text-white text-sm transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-zinc-400 hover:text-white text-sm transition-colors">
                Terms &amp; Conditions
              </Link>
              <Link href="/refund-policy" className="text-zinc-400 hover:text-white text-sm transition-colors">
                Refund Policy
              </Link>
            </div>
          </div>

          <div>
            <h3 className="font-outfit font-bold text-white text-sm tracking-widest uppercase mb-4">Support</h3>
            <div className="flex flex-col gap-3">
              <Link href="/contact" className="text-zinc-400 hover:text-white text-sm transition-colors">
                Contact Us
              </Link>
              <a href="mailto:support@clipaura.com" className="text-zinc-400 hover:text-white text-sm transition-colors">
                support@clipaura.com
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.06] pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <p className="text-zinc-600 text-xs">
            &copy; <span suppressHydrationWarning>{new Date().getFullYear()}</span> ClipAura. Operated by Vaibhav Nareshbhai Pamnani. All rights reserved.
          </p>
          <p className="text-zinc-700 text-xs">
            All trademarks and brand names belong to their respective owners.
          </p>
        </div>
      </div>
    </footer>
  );
}
