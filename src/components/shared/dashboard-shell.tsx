"use client";

import { useState } from "react";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardHeader } from "./dashboard-header";
import type { UserRole } from "@/lib/roles";

interface Props {
  restaurantId: string;
  userRole: UserRole;
  user: { name?: string | null; email?: string | null; image?: string | null };
  children: React.ReactNode;
}

/**
 * Holds the mobile sidebar drawer open/close state shared between
 * DashboardHeader (hamburger button) and DashboardSidebar (drawer panel).
 */
export function DashboardShell({ restaurantId, userRole, user, children }: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <DashboardSidebar
        restaurantId={restaurantId}
        userRole={userRole}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader
          restaurantId={restaurantId}
          user={user}
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 overflow-auto p-4 sm:p-6" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
