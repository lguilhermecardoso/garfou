/**
 * InventoryMovementsTable
 *
 * Displays paginated movement history for the restaurant's inventory.
 * Optionally scoped to a single item via the `itemId` prop.
 *
 * Features:
 *  - Polls are NOT used here — the table is a static snapshot loaded on mount
 *  - "Carregar mais" pagination (infinite-style append)
 *  - Color-coded by movement type: IN (green), OUT (red), ADJUSTMENT (amber)
 *  - Shows item name, type, quantity, reason, user, and date
 *
 * Props:
 *  @param restaurantId   — Restaurant UUID for API calls
 *  @param itemId         — Optional: filter to a specific inventory item
 *  @param title          — Optional heading override
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowDown, ArrowUp, RefreshCw, RotateCcw } from "lucide-react";

interface Movement {
  id: string;
  itemId: string;
  itemName: string;
  itemUnit: string;
  type: "IN" | "OUT" | "ADJUSTMENT";
  quantity: number;
  unitCost: number;
  reason: string | null;
  userName: string;
  createdAt: string;
}

interface Props {
  restaurantId: string;
  itemId?: string;
  title?: string;
}

const TYPE_CONFIG = {
  IN: {
    label: "Entrada",
    icon: ArrowDown,
    classes: "bg-emerald-50 text-emerald-700",
    iconClass: "text-emerald-500",
  },
  OUT: {
    label: "Saída",
    icon: ArrowUp,
    classes: "bg-red-50 text-red-700",
    iconClass: "text-red-500",
  },
  ADJUSTMENT: {
    label: "Ajuste",
    icon: RotateCcw,
    classes: "bg-amber-50 text-amber-700",
    iconClass: "text-amber-500",
  },
} as const;

const LIMIT = 30;

export function InventoryMovementsTable({ restaurantId, itemId, title }: Props) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchMovements = useCallback(
    async (pageNum: number, append = false) => {
      const qs = new URLSearchParams({
        page: String(pageNum),
        limit: String(LIMIT),
      });
      if (itemId) qs.set("itemId", itemId);

      const res = await fetch(`/api/restaurants/${restaurantId}/inventory/movements?${qs}`);
      if (!res.ok) return;

      const json = await res.json();
      const fetched: Movement[] = json.data ?? [];

      setMovements((prev) => (append ? [...prev, ...fetched] : fetched));
      setTotalPages(json.pagination?.totalPages ?? 1);
      setLoading(false);
      setLoadingMore(false);
    },
    [restaurantId, itemId]
  );

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    setPage(1);
    /* eslint-enable react-hooks/set-state-in-effect */
    fetchMovements(1, false);
  }, [fetchMovements]);

  function loadMore() {
    const next = page + 1;
    setPage(next);
    setLoadingMore(true);
    fetchMovements(next, true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-neutral-400">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        Carregando movimentações…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      {title && (
        <div className="border-b border-neutral-100 px-4 py-4">
          <h2 className="font-semibold text-neutral-900">{title}</h2>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Histórico de movimentações de estoque">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50">
              <th className="px-4 py-3 text-left font-semibold text-neutral-600">Data</th>
              <th className="px-4 py-3 text-left font-semibold text-neutral-600">Item</th>
              <th className="px-4 py-3 text-left font-semibold text-neutral-600">Tipo</th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-600">Qtd</th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-600">Custo/un.</th>
              <th className="px-4 py-3 text-left font-semibold text-neutral-600">Motivo</th>
              <th className="px-4 py-3 text-left font-semibold text-neutral-600">Usuário</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                  Nenhuma movimentação registrada
                </td>
              </tr>
            ) : (
              movements.map((m) => {
                const config = TYPE_CONFIG[m.type];
                const Icon = config.icon;
                const sign = m.type === "OUT" ? "-" : m.type === "IN" ? "+" : "±";

                return (
                  <tr key={m.id} className="border-b border-neutral-50 hover:bg-neutral-50/50">
                    <td className="px-4 py-3 whitespace-nowrap text-neutral-500">
                      {formatDate(m.createdAt)}
                    </td>
                    {/* Show item name only when not scoped to a single item */}
                    {!itemId && (
                      <td className="px-4 py-3 font-medium text-neutral-900">{m.itemName}</td>
                    )}
                    {itemId && <td className="px-4 py-3 text-xs text-neutral-500">{m.itemUnit}</td>}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.classes}`}
                      >
                        <Icon className={`h-3 w-3 ${config.iconClass}`} aria-hidden="true" />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-neutral-900">
                      {sign}
                      {Math.abs(m.quantity)} {m.itemUnit}
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-500">
                      {m.unitCost > 0 ? formatCurrency(m.unitCost) : "—"}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{m.reason ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-500">{m.userName}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {page < totalPages && (
        <div className="border-t border-neutral-100 px-4 py-3 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium disabled:opacity-50"
          >
            {loadingMore ? (
              <span className="flex items-center gap-1.5">
                <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
                Carregando…
              </span>
            ) : (
              "Carregar mais"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
