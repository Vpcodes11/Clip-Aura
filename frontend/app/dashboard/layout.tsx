"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Film,
  Clapperboard,
  Settings,
  LogOut,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, user, loading } = useAuth();

  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true";
  const usageLimit = isDevMode ? 240 : 60;
  const userInitial = user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || "U";

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  const navItems = [
    { name: "Projects", href: "/dashboard", icon: Film },
    { name: "Clips", href: "/dashboard/clips", icon: Clapperboard },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  if (loading || !user) {
    return (
      <div className="dashboard-gate">
        <Loader2 className="spin" size={22} />
        <span>{loading ? "Loading workspace..." : "Redirecting..."}</span>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-box">C</div>
          <div className="logo-name">Clip Aura</div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href === "/dashboard" && pathname === "/dashboard/projects");
            return (
              <Link key={item.name} href={item.href} className={`nav-item ${isActive ? "active" : ""}`}>
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
          <button className="nav-item logout mobile-logout" onClick={signOut}>
            <LogOut size={18} />
            Sign Out
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout" onClick={signOut}>
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="content-area">
        <header className="top-header">
          <div className="header-search">
            <span className="app-label">Clip Aura Studio</span>
          </div>
          <div className="header-actions">
            <div className="credit-pill">
              <Sparkles size={13} className="text-accent" />
              <span>{usageLimit} min remaining</span>
            </div>
            <div className="user-avatar" title={user?.email}>
              {userInitial.toUpperCase()}
            </div>
          </div>
        </header>

        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}
