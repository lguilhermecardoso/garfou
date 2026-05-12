/**
 * DashboardPendingOrders
 *
 * Live widget for the dashboard that shows up to 5 orders with status
 * NOVO_PEDIDO or AGUARDANDO_CONFIRMACAO. Auto-refreshes every 8 seconds.
 *
 * Each row offers:
 *  - Eye button  → opens OrderDetailModal (full receipt + approve/cancel)
 *  - Confirm button → PATCH status to CONFIRMADO inline (with auto-print)
 *
 * When there are no pending orders, renders a quiet empty state.
 *
 * Props:
 *  @param restaurantId   — Restaurant UUID used in API calls
 *  @param initialCount   — Optional count pre-fetched on the server (SSR hint only,
 *                          not used to populate the list — we always fetch on mount)
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { OrderDetailModal } from "./order-detail-modal";
import { printOrder } from "./order-print-receipt";
import type { PrintOrder } from "./order-print-receipt";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { CheckCircle, Eye, RefreshCw, BellRing } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingOrder {
  id: string;
  orderNumber: number;
  status: string;
  type: string;
  tableNumber: string | null;
  total: number;
  createdAt: string;
  items: unknown[];
}

interface Props {
  restaurantId: string;
  /** Optional server-side pre-fetched count (used only as initial badge hint). */
  initialCount?: number;
}

const POLL_MS = 8_000;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Dashboard live widget showing pending orders with quick approve/view actions.
 */
export function DashboardPendingOrders({ restaurantId }: Props) {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [actioning, setActioning] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Fetch ──────────────────────────────────────────────────────────────

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/restaurants/${restaurantId}/orders?status=NOVO_PEDIDO,AGUARDANDO_CONFIRMACAO&pageSize=5&page=1`
      );
      if (!res.ok) return;
      const json = await res.json();
      setOrders(json.orders ?? []);
      setNow(Date.now());
    } catch {
      // silently ignore network errors on background polls
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPending();
    intervalRef.current = setInterval(fetchPending, POLL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchPending]);

  // ─── Inline confirm action ───────────────────────────────────────────────

  async function confirmOrder(order: PendingOrder) {
    setActioning(order.id);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONFIRMADO" }),
      });
      if (!res.ok) return;
      const json = await res.json();
      const updated = json.data ?? json;

      // Auto-print after confirm
      if (updated) {
        printOrder(updated as unknown as PrintOrder);
      }

      // Remove from list (no longer pending)
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
    } finally {
      setActioning(null);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  if (!loading && orders.length === 0) {
    return null; // Nothing to show when queue is empty
  }

  return (
    <>
      {/* Detail modal rendered at the top level */}
      <OrderDetailModal
        orderId={selectedOrderId}
        restaurantId={restaurantId}
        onClose={() => setSelectedOrderId(null)}
        onStatusChange={(id) => {
          setOrders((prev) => prev.filter((o) => o.id !== id));
          setSelectedOrderId(null);
        }}
      />

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
              <BellRing className="h-4 w-4 text-amber-600" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">Pedidos pendentes</h2>
              <p className="text-xs text-neutral-400">Atualiza a cada 8s</p>
            </div>
          </div>
          {orders.length > 0 && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
              {orders.length}
            </span>
          )}
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-neutral-400">
            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span className="text-sm">Carregando...</span>
          </div>
        ) : (
          <ul
            role="list"
            aria-label="Pedidos pendentes de confirmação"
            className="divide-y divide-neutral-50"
          >
            {orders.map((order) => {
              const elapsed = Math.round((now - new Date(order.createdAt).getTime()) / 60_000);
              return (
                <li
                  key={order.id}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-neutral-50"
                >
                  {/* Order info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-neutral-900">
                        #{order.orderNumber}
                      </span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500">
                      <span>{order.type.replace(/_/g, " ")}</span>
                      {order.tableNumber && <span>· Mesa {order.tableNumber}</span>}
                      <span>
                        · {order.items.length} ite{order.items.length === 1 ? "m" : "ns"}
                      </span>
                    </div>
                  </div>

                  {/* Time elapsed */}
                  <span className="text-xs whitespace-nowrap text-neutral-400">
                    {elapsed < 1 ? "agora" : `${elapsed} min`}
                  </span>

                  {/* Total */}
                  <span className="text-sm font-bold whitespace-nowrap text-neutral-900">
                    {formatCurrency(order.total)}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedOrderId(order.id)}
                      title="Ver detalhes"
                      aria-label={`Ver detalhes do pedido #${order.orderNumber}`}
                      className="rounded-lg bg-neutral-100 p-1.5 text-neutral-600 transition-colors hover:bg-neutral-200"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => confirmOrder(order)}
                      disabled={actioning === order.id}
                      title="Confirmar e imprimir"
                      aria-label={`Confirmar pedido #${order.orderNumber}`}
                      className="rounded-lg bg-green-500 p-1.5 text-white transition-colors hover:bg-green-600 disabled:opacity-50"
                    >
                      {actioning === order.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <CheckCircle className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Footer link */}
        {!loading && orders.length > 0 && (
          <div className="border-t border-neutral-100 px-5 py-3 text-center">
            <a
              href={`/dashboard/${restaurantId}/orders`}
              className="text-primary-500 text-xs hover:underline"
            >
              Ver todos os pedidos →
            </a>
          </div>
        )}
      </div>
    </>
  );
}
