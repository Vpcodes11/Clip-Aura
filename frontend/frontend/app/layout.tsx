import type { Metadata } from "next";
import Link from "next/link";
import { AuthProvider } from "@/lib/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clip Aura — Stealth AI Video Workspace",
  description: "The elite engine for viral content creation.",
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
                <Link href="/login">Pricing</Link>              </div>
              <Link href="/login">
                <button className="nav-btn">Access Beta</button>
              </Link>              </div>
          </nav>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </AuthProvider>
      </body>
    </html>
  );
}
