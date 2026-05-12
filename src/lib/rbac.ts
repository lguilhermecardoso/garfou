/**
 * RBAC helpers — verificação de permissão por role.
 * Usado em todos os route handlers do dashboard.
 */
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasMinRole as hasMinRoleByHierarchy, type UserRole } from "@/lib/roles";

export type { UserRole };

/**
 * Verifica se o usuário autenticado tem acesso ao restaurante
 * e retorna a sua role. Retorna null se não tiver acesso.
 */
export async function getRestaurantMembership(restaurantId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const member = await prisma.userRestaurant.findUnique({
    where: {
      userId_restaurantId: {
        userId: session.user.id,
        restaurantId,
      },
    },
    select: { role: true },
  });

  if (!member) return null;
  return { userId: session.user.id, role: member.role as UserRole };
}

/**
 * Garante que o usuário tem pelo menos o nível de role exigido.
 */
export function hasMinRole(userRole: UserRole, minRole: UserRole): boolean {
  return hasMinRoleByHierarchy(userRole, minRole);
}

/**
 * Verifica acesso e retorna { userId, role } ou lança 401/403.
 * Use como guard no início de route handlers protegidos.
 *
 * OWNER sempre tem acesso total, independente da role requerida.
 */
export async function requireRole(restaurantId: string, minRole: UserRole = "WAITER") {
  const membership = await getRestaurantMembership(restaurantId);

  if (!membership) {
    return { error: "Não autorizado", status: 401 } as const;
  }

  // OWNER tem acesso total a tudo, independente de permissão
  if (membership.role === "OWNER") {
    return { userId: membership.userId, role: membership.role };
  }

  if (!hasMinRole(membership.role, minRole)) {
    return {
      error: `Permissão insuficiente. Requerido: ${minRole}`,
      status: 403,
    } as const;
  }

  return { userId: membership.userId, role: membership.role };
}
