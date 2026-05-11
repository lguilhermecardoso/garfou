"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingBag,
  ChefHat,
  UtensilsCrossed,
  BarChart3,
  Package,
  DollarSign,
  Users,
  Settings,
  Star,
  Tag,
  Truck,
} from "lucide-react";

interface Props {
  restaurantId: string;
}

const navItems = [
  { href: "", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Pedidos", icon: ShoppingBag },
  { href: "/kitchen", label: "Cozinha", icon: ChefHat },
  { href: "/waiter", label: "Garçom", icon: UtensilsCrossed },
  { href: "/menu", label: "Cardápio", icon: UtensilsCrossed },
  { href: "/inventory", label: "Estoque", icon: Package },
  { href: "/finance", label: "Financeiro", icon: DollarSign },
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/coupons", label: "Cupons", icon: Tag },
  { href: "/delivery", label: "Entrega", icon: Truck },
  { href: "/nps", label: "NPS", icon: Star },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function DashboardSidebar({ restaurantId }: Props) {
  const pathname = usePathname();
  const base = `/dashboard/${restaurantId}`;

  return (
    <aside
      className="hidden w-56 shrink-0 border-r border-neutral-200 bg-white lg:flex lg:flex-col"
      aria-label="Navegação lateral"
    >
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-4">
        <UtensilsCrossed className="h-6 w-6 text-primary-500" aria-hidden="true" />
        <span className="text-lg font-bold text-neutral-900">GARFOU</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5" role="list">
          {navItems.map((item) => {
            const href = `${base}${item.href}`;
            const isActive = item.href === ""
              ? pathname === base
              : pathname.startsWith(href);

            return (
              <li key={item.href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-50 text-primary-600"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-primary-500" : "text-neutral-400"
                    )}
                    aria-hidden="true"
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
