"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Package } from "lucide-react";
import { StockOperationsModal } from "./stock-operations-modal";
import { useRouter } from "next/navigation";

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  averageCost: number;
}

interface Props {
  items: InventoryItem[];
  restaurantId: string;
}

export function InventoryTable({ items, restaurantId }: Props) {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  function handleSuccess() {
    router.refresh();
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm" aria-label="Itens de estoque">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50">
              <th className="px-4 py-3 text-left font-semibold text-neutral-600">Item</th>
              <th className="px-4 py-3 text-left font-semibold text-neutral-600">Unidade</th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-600">Estoque atual</th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-600">Mínimo</th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-600">Custo/un.</th>
              <th className="px-4 py-3 text-center font-semibold text-neutral-600">Status</th>
              <th className="px-4 py-3 text-center font-semibold text-neutral-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                  Nenhum item cadastrado
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isLow = Number(item.currentStock) <= Number(item.minimumStock);
                return (
                  <tr key={item.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium text-neutral-900">{item.name}</td>
                    <td className="px-4 py-3 text-neutral-500">{item.unit}</td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${isLow ? "text-red-500" : "text-neutral-900"}`}
                    >
                      {Number(item.currentStock)}
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-500">
                      {Number(item.minimumStock)}
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-500">
                      {Number(item.averageCost) > 0
                        ? formatCurrency(Number(item.averageCost))
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${isLow ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}
                      >
                        {isLow ? "Baixo" : "OK"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="text-primary-600 hover:bg-primary-50 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                      >
                        <Package className="h-3.5 w-3.5" />
                        Movimentar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <StockOperationsModal
          item={selectedItem}
          restaurantId={restaurantId}
          onClose={() => setSelectedItem(null)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
