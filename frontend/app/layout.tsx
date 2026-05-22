import type { Metadata } from "next";
import Link from "next/link";
import { AuthProvider } from "@/lib/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://clipaura.com'),
  title: "ClipAura — AI-Powered Creator Clipping",
  description: "The elite engine for viral content creation. Transform long-form content into cinematic shorts with deterministic precision and ultimate privacy.",
  openGraph: {
    title: "ClipAura — AI-Powered Creator Clipping",
    description: "The elite engine for viral content creation. Transform long-form content into cinematic shorts.",
    url: 'https://clipaura.com',
    siteName: 'ClipAura',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ClipAura Cinematic Video Engine',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ClipAura — AI-Powered Creator Clipping',
    description: 'Transform long-form content into cinematic shorts.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "ClipAura",
              "applicationCategory": "MultimediaApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "49.00",
                "priceCurrency": "USD"
              },
              "description": "AI-powered cinematic clipping platform for creators."
            })
          }}
        />
      </head>
      <body>
        <AuthProvider>
          <nav className="stealth-nav">
            <div className="nav-container">
              <div className="logo-text">CLIP AURA</div>
              <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-zinc-400">
                <Link href="/#features" className="hover:text-white transition-colors">Features</Link>
                <Link href="/#demo" className="hover:text-white transition-colors">Showcase</Link>
                <Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link>
              </div>
              <div className="flex items-center gap-4">
                <Link href="/login" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors hidden sm:block">
                  Sign In
                </Link>
                <Link href="/#waitlist">
                  <button className="btn-secondary px-5 py-2 text-sm">Request Access</button>
                </Link>
              </div>
            </div>
          </nav>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </AuthProvider>
      </body>
    </html>
  );
}
