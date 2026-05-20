"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clapperboard,
  LogOut,
  Sparkles,
  Menu,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { authenticatedFetch } from "@/lib/supabase";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { signOut, user } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [minsRemaining, setMinsRemaining] = useState<number | null>(null);

  const userInitial =
    user?.user_metadata?.full_name?.charAt(0) ||
    user?.email?.charAt(0) ||
    "U";

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await authenticatedFetch(`${apiUrl}/api/me`);
        if (res.ok) {
          const data = await res.json();
          setMinsRemaining(data.minutes_remaining ?? null);
        }
      } catch {}
    };
    fetchMe();
  }, []);

  const navItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Clips", href: "/dashboard/clips", icon: Clapperboard },
  ];

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="dash-logo">
        <div className="dash-logo-box">
          <Sparkles size={16} strokeWidth={2.5} />
        </div>
        <span className="dash-logo-name">CLIP AURA</span>
      </div>

      {/* Nav */}
      <nav className="dash-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`dash-nav-item ${isActive ? "dash-nav-active" : ""}`}
              onClick={() => setIsMobileOpen(false)}
            >
              <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="dash-sidebar-bottom">
        {minsRemaining !== null && (
          <div className="dash-credit-pill">
            <Zap size={13} />
            <span>{minsRemaining} mins left</span>
          </div>
        )}
        <button className="dash-nav-item dash-signout" onClick={signOut}>
          <LogOut size={17} strokeWidth={2} />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="dash-shell">
      {/* ── Desktop sidebar ── */}
      <aside className="dash-sidebar">
        <SidebarContent />
      </aside>

      {/* ── Mobile drawer backdrop ── */}
      {isMobileOpen && (
        <div
          className="dash-backdrop"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside className={`dash-drawer ${isMobileOpen ? "dash-drawer-open" : ""}`}>
        <button
          className="dash-drawer-close"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
        <SidebarContent />
      </aside>

      {/* ── Main content ── */}
      <div className="dash-content">
        {/* Topbar */}
        <header className="dash-topbar">
          <button
            className="dash-hamburger"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className="dash-topbar-right">
            {minsRemaining !== null && (
              <div className="dash-credit-pill dash-credit-pill-inline">
                <Zap size={13} />
                <span>{minsRemaining} mins left</span>
              </div>
            )}
            <div className="dash-avatar" title={user?.email || "User"}>
              {userInitial.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="dash-main">{children}</main>
      </div>

      <style jsx global>{`
        /* ─── Shell layout ─── */
        .dash-shell {
          display: flex;
          min-height: 100vh;
          background:
            radial-gradient(circle at 12% 0%, rgba(124, 58, 237, 0.14), transparent 28rem),
            radial-gradient(circle at 88% 8%, rgba(6, 182, 212, 0.10), transparent 26rem),
            linear-gradient(135deg, #070910 0%, #05060a 50%, #0a0d16 100%);
        }

        /* ─── Sidebar (desktop) ─── */
        .dash-sidebar {
          position: sticky;
          top: 0;
          height: 100vh;
          width: 232px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          padding: 28px 16px;
          border-right: 1px solid rgba(255,255,255,0.08);
          background: linear-gradient(180deg, rgba(12,15,26,0.96), rgba(7,9,16,0.92));
          backdrop-filter: blur(22px) saturate(1.2);
          -webkit-backdrop-filter: blur(22px) saturate(1.2);
          overflow-y: auto;
        }

        @media (max-width: 860px) {
          .dash-sidebar { display: none; }
        }

        /* ─── Mobile drawer ─── */
        .dash-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.72);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 80;
        }

        .dash-drawer {
          position: fixed;
          inset: 0 auto 0 0;
          width: 240px;
          display: none;
          flex-direction: column;
          padding: 28px 16px;
          z-index: 90;
          background: linear-gradient(180deg, rgba(12,15,26,0.99), rgba(7,9,16,0.98));
          backdrop-filter: blur(24px) saturate(1.3);
          -webkit-backdrop-filter: blur(24px) saturate(1.3);
          border-right: 1px solid rgba(255,255,255,0.08);
          transform: translateX(-100%);
          transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
          overflow-y: auto;
        }

        @media (max-width: 860px) {
          .dash-drawer { display: flex; }
        }

        .dash-drawer-open {
          transform: translateX(0);
        }

        .dash-drawer-close {
          align-self: flex-end;
          background: none;
          border: none;
          color: rgba(255,255,255,0.45);
          cursor: pointer;
          padding: 4px;
          margin-bottom: 16px;
          border-radius: 6px;
          transition: color 0.15s ease;
        }
        .dash-drawer-close:hover { color: #fff; }

        /* ─── Logo ─── */
        .dash-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 36px;
          padding: 0 6px;
        }

        .dash-logo-box {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #7c3aed, #06b6d4);
          color: #fff;
          flex-shrink: 0;
        }

        .dash-logo-name {
          font-family: var(--font-outfit);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.16em;
          color: #fff;
        }

        /* ─── Nav items ─── */
        .dash-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .dash-nav-item {
          display: flex;
          align-items: center;
          gap: 11px;
          min-height: 42px;
          padding: 0 12px;
          border-radius: 10px;
          border: 1px solid transparent;
          color: rgba(255,255,255,0.52);
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.16s ease, color 0.16s ease, border-color 0.16s ease;
          cursor: pointer;
          background: none;
          width: 100%;
          text-align: left;
        }

        .dash-nav-item:hover {
          background: rgba(255,255,255,0.06);
          color: #fff;
        }

        .dash-nav-active {
          border-color: rgba(124, 58, 237, 0.28) !important;
          background: linear-gradient(90deg, rgba(124,58,237,0.16), rgba(255,255,255,0.04)) !important;
          color: #fff !important;
          box-shadow: inset 3px 0 0 #7c3aed;
        }

        /* ─── Sidebar bottom ─── */
        .dash-sidebar-bottom {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.07);
        }

        .dash-credit-pill {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.72);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .dash-credit-pill svg { color: #7c3aed; }

        .dash-signout {
          color: rgba(239,68,68,0.82) !important;
        }
        .dash-signout:hover {
          background: rgba(239,68,68,0.1) !important;
          color: #fca5a5 !important;
        }

        /* ─── Content column ─── */
        .dash-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          min-height: 100vh;
        }

        /* ─── Topbar ─── */
        .dash-topbar {
          position: sticky;
          top: 0;
          z-index: 40;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          background: linear-gradient(180deg, rgba(7,9,16,0.92), rgba(5,6,10,0.82));
          backdrop-filter: blur(20px) saturate(1.15);
          -webkit-backdrop-filter: blur(20px) saturate(1.15);
        }

        .dash-hamburger {
          display: none;
          background: none;
          border: none;
          color: rgba(255,255,255,0.72);
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .dash-hamburger:hover { background: rgba(255,255,255,0.08); color: #fff; }

        @media (max-width: 860px) {
          .dash-hamburger { display: flex; align-items: center; }
        }

        .dash-topbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-left: auto;
        }

        .dash-credit-pill-inline {
          border-radius: 999px;
        }

        .dash-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #7c3aed, #06b6d4);
          font-size: 13px;
          font-weight: 800;
          color: #fff;
          flex-shrink: 0;
          cursor: default;
          user-select: none;
        }

        /* ─── Page content ─── */
        .dash-main {
          flex: 1;
          padding: 32px 28px;
          overflow-y: auto;
        }

        @media (max-width: 600px) {
          .dash-topbar { padding: 0 16px; }
          .dash-main { padding: 20px 16px; }
        }
      `}</style>
    </div>
  );
}
}
