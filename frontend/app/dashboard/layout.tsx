"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Clapperboard,
  LogOut, 
  Sparkles,
  Menu,
  X
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { signOut, user } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';
  const usageLimit = isDevMode ? 1000 : 15;
  const userInitial = user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || "U";

  const navItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Clips", href: "/dashboard/clips", icon: Clapperboard },
  ];

  return (
    <div className="dashboard-shell flex flex-col md:flex-row min-h-screen text-white relative">
      {/* Mobile Top Bar */}
      <header className="dashboard-mobile-header flex md:hidden items-center justify-between px-6 py-4 sticky top-0 z-40 w-full">
        <div className="flex items-center gap-3">
          <div className="logo-box">C</div>
          <div className="logo-name">CLIP AURA</div>
        </div>
        <button 
          onClick={() => setIsMobileOpen(!isMobileOpen)} 
          className="p-2 text-muted hover:text-white transition-colors"
          aria-label="Toggle Menu"
        >
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Sidebar Backdrop Drawer */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden transition-opacity" 
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar - Off-canvas on mobile, static on desktop */}
      <aside className={`
        dashboard-sidebar fixed inset-y-0 left-0 z-50 w-64 flex flex-col p-6 
        transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen md:sticky md:top-0
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="logo-box">C</div>
            <div className="logo-name">CLIP AURA</div>
          </div>
          {/* Close button inside sidebar on mobile */}
          <button 
            onClick={() => setIsMobileOpen(false)} 
            className="md:hidden p-1 text-muted hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href} 
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={() => setIsMobileOpen(false)}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <button className="nav-item logout w-full" onClick={signOut}>
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Header - Hidden on mobile as mobile top bar replaces it */}
        <header className="dashboard-topbar hidden md:flex h-20 items-center justify-between px-10">
          <div className="flex items-center">
            <div className="search-badge">CMD + K TO SEARCH</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="credit-pill">
              <Sparkles size={14} className="text-accent" />
              <span>{usageLimit} MINS REMAINING</span>
            </div>
            <div className="user-avatar" title={user?.email || "User"}>
              {userInitial.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
