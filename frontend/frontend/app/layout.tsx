import type { Metadata } from "next";
import Link from "next/link";
import { AuthProvider } from "@/lib/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clip Aura — AI Video Clipping Engine",
  description: "The elite engine for viral content creation. Transform long-form content into cinematic shorts.",
  icons: {
    icon: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="%237c3aed"/><text x="16" y="22" text-anchor="middle" fill="white" font-size="18" font-weight="800" font-family="Outfit, sans-serif">C</text></svg>`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <AuthProvider>
          <nav className="stealth-nav">
            <div className="nav-container">
              <div className="logo-text">CLIP AURA</div>
              <div className="nav-links">
                <Link href="/#features">Features</Link>
                <Link href="/login">Pricing</Link>
              </div>
              <Link href="/login">
                <button className="nav-btn">Access Beta</button>
              </Link>
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
