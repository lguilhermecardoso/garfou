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
  Receipt,
  Users,
  Settings,
  Star,
  Tag,
  Truck,
  MessageCircle,
  Flame,
  Table2,
  Wallet,
} from "lucide-react";
import type { UserRole } from "@/lib/roles";
import type { MenuItem } from "@/lib/menu-permissions";
import { filterMenuByRole } from "@/lib/menu-permissions";

interface Props {
  restaurantId: string;
  userRole: UserRole;
}

const navItems: MenuItem[] = [
  {
    href: "",
    label: "Dashboard",
    icon: LayoutDashboard,
    allowedRoles: ["OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN"],
  },
  {
    href: "/orders",
    label: "Pedidos",
    icon: ShoppingBag,
    allowedRoles: ["OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN"],
  },
  {
    href: "/kitchen",
    label: "Cozinha",
    icon: ChefHat,
    allowedRoles: ["OWNER", "MANAGER", "KITCHEN"],
  },
  {
    href: "/waiter",
    label: "Garçom",
    icon: UtensilsCrossed,
    allowedRoles: ["OWNER", "MANAGER", "WAITER"],
  },
  {
    href: "/pos",
    label: "PDV",
    icon: Receipt,
    allowedRoles: ["OWNER", "MANAGER", "CASHIER"],
  },
  {
    href: "/settings/tables",
    label: "Mesas",
    icon: Table2,
    allowedRoles: ["OWNER", "MANAGER", "WAITER"],
  },
  {
    href: "/menu",
    label: "Cardápio",
    icon: UtensilsCrossed,
    allowedRoles: ["OWNER", "MANAGER"],
  },
  {
    href: "/inventory",
    label: "Estoque",
    icon: Package,
    allowedRoles: ["OWNER", "MANAGER"],
  },
  {
    href: "/finance",
    label: "Financeiro",
    icon: DollarSign,
    allowedRoles: ["OWNER", "MANAGER", "CASHIER"],
  },
  {
    href: "/wallet",
    label: "Carteira Online",
    icon: Wallet,
    allowedRoles: ["OWNER", "MANAGER"],
  },
  {
    href: "/customers",
    label: "Clientes",
    icon: Users,
    allowedRoles: ["OWNER", "MANAGER", "CASHIER", "WAITER"],
  },
  {
    href: "/reports",
    label: "Relatórios",
    icon: BarChart3,
    allowedRoles: ["OWNER", "MANAGER", "CASHIER"],
  },
  {
    href: "/coupons",
    label: "Cupons",
    icon: Tag,
    allowedRoles: ["OWNER", "MANAGER", "CASHIER"],
  },
  {
    href: "/delivery",
    label: "Entrega",
    icon: Truck,
    allowedRoles: ["OWNER", "MANAGER", "WAITER"],
  },
  {
    href: "/whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    allowedRoles: ["OWNER", "MANAGER"],
  },
  {
    href: "/nps",
    label: "NPS",
    icon: Star,
    allowedRoles: ["OWNER", "MANAGER"],
  },
  {
    href: "/settings/team",
    label: "Equipe",
    icon: Users,
    allowedRoles: ["OWNER"],
  },
  {
    href: "/settings",
    label: "Configurações",
    icon: Settings,
    allowedRoles: ["OWNER", "MANAGER"],
  },
];

export function DashboardSidebar({ restaurantId, userRole }: Props) {
  const pathname = usePathname();
  const base = `/dashboard/${restaurantId}`;

  // Filtra os itens do menu baseado na role do usuário
  const visibleItems = filterMenuByRole(navItems, userRole);

  return (
    <aside
      className="hidden w-56 shrink-0 border-r border-neutral-200 bg-white lg:flex lg:flex-col"
      aria-label="Navegação lateral"
    >
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-4">
        <Flame className="text-primary-500 h-6 w-6" aria-hidden="true" />
        <span className="text-lg font-bold text-neutral-900">chamou.delivery</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5" role="list">
          {visibleItems.map((item) => {
            const href = `${base}${item.href}`;
            const isActive = item.href === "" ? pathname === base : pathname.startsWith(href);

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
