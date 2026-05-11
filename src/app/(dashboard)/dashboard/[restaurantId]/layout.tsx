import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/shared/dashboard-sidebar";
import { DashboardHeader } from "@/components/shared/dashboard-header";

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

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <DashboardSidebar restaurantId={restaurantId} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader restaurantId={restaurantId} user={session.user} />
        <main className="flex-1 overflow-auto p-4 sm:p-6" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
