export type UserRole = "OWNER" | "MANAGER" | "WAITER" | "KITCHEN" | "CASHIER";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  OWNER: 5,
  MANAGER: 4,
  CASHIER: 3,
  WAITER: 2,
  KITCHEN: 1,
};

export function hasMinRole(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}