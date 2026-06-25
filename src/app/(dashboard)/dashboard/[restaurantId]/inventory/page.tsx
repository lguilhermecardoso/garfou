import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AlertTriangle, History } from "lucide-react";
import { InventoryTable } from "@/features/inventory/inventory-table";
import { PaginationControls } from "@/components/shared/pagination-controls";
import Link from "next/link";

export const metadata: Metadata = { title: "Estoque" };

interface Props {
  params: Promise<{ restaurantId: string }>;
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}

export default async function InventoryPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { restaurantId } = await params;
  const { page: rawPage, pageSize: rawPageSize } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const pageSize = Math.max(1, Number(rawPageSize) || 20);

  // Lightweight pass over all items: accurate total + low-stock alert
  const [allStockLevels, items] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { restaurantId, deletedAt: null },
      select: { name: true, currentStock: true, minimumStock: true },
    }),
    prisma.inventoryItem.findMany({
      where: { restaurantId, deletedAt: null },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const total = allStockLevels.length;
  const lowStock = allStockLevels.filter((i) => Number(i.currentStock) <= Number(i.minimumStock));

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
            {total} itens · {lowStock.length} com estoque baixo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/${restaurantId}/inventory/movements`}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
          >
            <History className="h-4 w-4" aria-hidden="true" />
            Histórico
          </Link>
          <a
            href={`/dashboard/${restaurantId}/inventory/new`}
            className="bg-primary-500 hover:bg-primary-600 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            + Novo item
          </a>
        </div>
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
      <div className="rounded-2xl bg-white shadow-sm">
        <PaginationControls page={page} pageSize={pageSize} total={total} />
      </div>
    </div>
  );
}
