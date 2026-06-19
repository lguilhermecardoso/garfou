import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { NewOrderAlertProvider } from "@/components/shared/new-order-alert-provider";
import { getRestaurantMembership } from "@/lib/rbac";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ restaurantId: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const { restaurantId } = await params;

  // Busca a role do usuário neste restaurante
  const membership = await getRestaurantMembership(restaurantId);
  if (!membership) {
    // Usuário não tem acesso a este restaurante
    redirect("/dashboard");
  }

  return (
    <>
      <NewOrderAlertProvider restaurantId={restaurantId} />
      <DashboardShell restaurantId={restaurantId} userRole={membership.role} user={session.user}>
        {children}
      </DashboardShell>
    </>
  );
}
