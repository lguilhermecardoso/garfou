import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { InventoryMovementsTable } from "@/features/inventory/inventory-movements-table";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Histórico de Estoque" };

interface Props {
  params: Promise<{ restaurantId: string }>;
}

export default async function InventoryMovementsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { restaurantId } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/${restaurantId}/inventory`}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Histórico de Movimentações</h1>
          <p className="text-sm text-neutral-500">Todas as entradas, saídas e ajustes de estoque</p>
        </div>
      </div>

      <InventoryMovementsTable restaurantId={restaurantId} title="Movimentações recentes" />
    </div>
  );
}
