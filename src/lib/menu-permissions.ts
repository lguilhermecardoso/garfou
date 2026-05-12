/**
 * Menu Permissions — define quais itens do menu cada role pode ver
 *
 * Matriz de Permissões:
 *
 * OWNER    - Acesso total a tudo
 * MANAGER  - Acesso a tudo exceto billing/subscription
 * CASHIER  - PDV, Pedidos, Financeiro, Clientes, Cupons, Relatórios
 * WAITER   - Pedidos, Garçom, Mesas, Clientes (visão limitada)
 * KITCHEN  - Pedidos, Cozinha
 */

import type React from "react";
import type { UserRole } from "./roles";

export type MenuItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: UserRole[];
};

/**
 * Verifica se uma role tem permissão para ver um item do menu
 */
export function canAccessMenuItem(userRole: UserRole, menuItem: MenuItem): boolean {
  // OWNER sempre tem acesso a tudo
  if (userRole === "OWNER") return true;

  return menuItem.allowedRoles.includes(userRole);
}

/**
 * Filtra itens do menu baseado na role do usuário
 */
export function filterMenuByRole(menuItems: MenuItem[], userRole: UserRole): MenuItem[] {
  return menuItems.filter((item) => canAccessMenuItem(userRole, item));
}

/**
 * Definição de permissões por feature:
 *
 * Dashboard - Todos (visão geral personalizada por role)
 * Pedidos - Todos (cada um vê de forma diferente)
 * Cozinha - KITCHEN, MANAGER, OWNER
 * Garçom - WAITER, MANAGER, OWNER
 * PDV - CASHIER, MANAGER, OWNER
 * Mesas - WAITER, MANAGER, OWNER
 * Cardápio - MANAGER, OWNER
 * Estoque - MANAGER, OWNER
 * Financeiro - CASHIER, MANAGER, OWNER
 * Clientes - WAITER (limitado), CASHIER, MANAGER, OWNER
 * Relatórios - CASHIER (limitado), MANAGER, OWNER
 * Cupons - CASHIER, MANAGER, OWNER
 * Entrega - WAITER, MANAGER, OWNER
 * WhatsApp - MANAGER, OWNER
 * NPS - MANAGER, OWNER
 * Configurações - OWNER (geral), MANAGER (limitado)
 */
