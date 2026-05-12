import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/shared/dashboard-sidebar";
import { DashboardHeader } from "@/components/shared/dashboard-header";
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
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <DashboardSidebar restaurantId={restaurantId} userRole={membership.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader restaurantId={restaurantId} user={session.user} />
        <main className="flex-1 overflow-auto p-4 sm:p-6" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
