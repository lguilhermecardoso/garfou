import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { InventoryTable } from "@/features/inventory/inventory-table";

export const metadata: Metadata = { title: "Estoque" };

interface Props {
  params: Promise<{ restaurantId: string }>;
}

export default async function InventoryPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { restaurantId } = await params;

  const items = await prisma.inventoryItem.findMany({
    where: { restaurantId, deletedAt: null },
    orderBy: { name: "asc" },
  });

  const lowStock = items.filter((i) => Number(i.currentStock) <= Number(i.minimumStock));

  // Convert Decimal to number for client component
  const serializedItems = items.map((item) => ({
    id: item.id,
    name: item.name,
    unit: item.unit,
    currentStock: Number(item.currentStock),
    minimumStock: Number(item.minimumStock),
    averageCost: Number(item.averageCost),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Estoque</h1>
          <p className="text-sm text-neutral-500">
            {items.length} itens · {lowStock.length} com estoque baixo
          </p>
        </div>
        <a
          href={`/dashboard/${restaurantId}/inventory/new`}
          className="bg-primary-500 hover:bg-primary-600 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors"
        >
          + Novo item
        </a>
      </div>

      {lowStock.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
          <div>
            <p className="font-semibold text-amber-800">Atenção: estoque baixo</p>
            <p className="mt-0.5 text-sm text-amber-700">
              {lowStock.map((i) => i.name).join(", ")} {lowStock.length === 1 ? "está" : "estão"}{" "}
              com estoque abaixo do mínimo.
            </p>
          </div>
        </div>
      )}

      <InventoryTable items={serializedItems} restaurantId={restaurantId} />
    </div>
  );
}
