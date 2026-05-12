import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OrdersLiveTable } from "@/features/orders/orders-live-table";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pedidos" };

interface Props {
  params: Promise<{ restaurantId: string }>;
  searchParams: Promise<{ status?: string }>;
}

export default async function OrdersPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { restaurantId } = await params;
  const { status } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Pedidos</h1>
        <p className="text-sm text-neutral-500">Acompanhe e gerencie pedidos em tempo real.</p>
      </div>

      <OrdersLiveTable restaurantId={restaurantId} initialStatus={status} />
    </div>
  );
}
