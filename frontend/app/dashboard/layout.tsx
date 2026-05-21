"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Video, 
  CreditCard, 
  Settings, 
  LogOut, 
  Sparkles 
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { signOut, user } = useAuth();

  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';
  const usageLimit = isDevMode ? 1000 : 15;
  const userInitial = user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || "U";

  const navItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Projects", href: "/dashboard/projects", icon: Video },
    { name: "Usage", href: "/dashboard/billing", icon: CreditCard },
    { name: "System", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="dashboard-wrapper">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-box">O</div>
          <div className="logo-name">CLIP AURA</div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href} className={`nav-item ${isActive ? "active" : ""}`}>
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout" onClick={signOut}>
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="content-area">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-search">
            <div className="search-badge">CMD + K TO SEARCH</div>
          </div>
          <div className="header-actions">
            <div className="credit-pill">
              <Sparkles size={14} className="text-accent" />
              <span>{usageLimit} MINS REMAINING</span>
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
