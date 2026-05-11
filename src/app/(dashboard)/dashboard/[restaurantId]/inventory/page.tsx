import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Estoque</h1>
          <p className="text-sm text-neutral-500">{items.length} itens · {lowStock.length} com estoque baixo</p>
        </div>
        <a
          href={`/dashboard/${restaurantId}/inventory/new`}
          className="rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
        >
          + Novo item
        </a>
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-semibold text-amber-800">Atenção: estoque baixo</p>
            <p className="text-sm text-amber-700 mt-0.5">
              {lowStock.map((i) => i.name).join(", ")} {lowStock.length === 1 ? "está" : "estão"} com estoque abaixo do mínimo.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm" aria-label="Itens de estoque">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-100">
              <th className="px-4 py-3 text-left font-semibold text-neutral-600">Item</th>
              <th className="px-4 py-3 text-left font-semibold text-neutral-600">Unidade</th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-600">Estoque atual</th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-600">Mínimo</th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-600">Custo/un.</th>
              <th className="px-4 py-3 text-center font-semibold text-neutral-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">Nenhum item cadastrado</td>
              </tr>
            ) : (
              items.map((item) => {
                const isLow = Number(item.currentStock) <= Number(item.minimumStock);
                return (
                  <tr key={item.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium text-neutral-900">{item.name}</td>
                    <td className="px-4 py-3 text-neutral-500">{item.unit}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${isLow ? "text-red-500" : "text-neutral-900"}`}>
                      {Number(item.currentStock)}
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-500">{Number(item.minimumStock)}</td>
                    <td className="px-4 py-3 text-right text-neutral-500">
                      {Number(item.averageCost) > 0 ? formatCurrency(Math.round(Number(item.averageCost) * 100)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${isLow ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
                        {isLow ? "Baixo" : "OK"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
