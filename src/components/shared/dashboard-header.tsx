"use client";

import { Bell, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  restaurantId: string;
  user: { name?: string | null; email?: string | null; image?: string | null };
}

export function DashboardHeader({ restaurantId: _restaurantId, user }: Props) {
  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
      {/* Mobile menu button — sidebar toggle */}
      <button
        className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <button
          className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-600 text-xs font-bold">
            {user.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <span className="hidden text-sm font-medium text-neutral-700 sm:block">
            {user.name ?? user.email}
          </span>
        </div>

        <form action="/api/auth/signout" method="POST">
          <Button variant="ghost" size="icon-sm" type="submit" aria-label="Sair">
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </form>
      </div>
    </header>
  );
}
