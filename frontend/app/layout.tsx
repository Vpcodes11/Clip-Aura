import type { Metadata } from "next";
import Link from "next/link";
import { AuthProvider } from "@/lib/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clipaura — Stealth AI Video Workspace",
  description: "The elite engine for viral content creation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <nav className="stealth-nav">
            <div className="nav-container">
              <div className="logo-text">CLIPAURA</div>
              <div className="nav-links">
                <Link href="/dashboard">Features</Link>
                <Link href="/dashboard/billing">Pricing</Link>
                <Link href="/dashboard/settings">System</Link>
              </div>
              <Link href="/dashboard">
                <button className="nav-btn">Access Beta</button>
              </Link>
            </div>
          </nav>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
