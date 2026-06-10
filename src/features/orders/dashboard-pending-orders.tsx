/**
 * DashboardPendingOrders
 *
 * Live widget for the dashboard that shows up to 5 orders with status
 * NOVO_PEDIDO or AGUARDANDO_CONFIRMACAO. Auto-refreshes every 8 seconds.
 *
 * Features:
 *  - Eye button  → opens OrderDetailModal (full receipt + approve/cancel)
 *  - Confirm button → PATCH status to CONFIRMADO inline (with auto-print)
 *  - Notification sound loop — toca continuamente até ser marcado como lido
 *  - Read/unread state — persiste no localStorage para cada pedido
 *  - Visual indicator — sino pulsando quando há pedidos não lidos
 *
 * Behavior:
 *  - Som toca em loop (a cada 2s) quando há pedidos não lidos
 *  - Som para quando: usuário clica no sino, visualiza pedido, ou confirma pedido
 *  - Estado de leitura persiste entre recarregamentos da página
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
import { PrintConfirmationModal } from "@/components/shared/print-confirmation-modal";
import { usePrintConfirmation } from "@/hooks/use-print-confirmation";
import { useNotificationSound } from "@/hooks/use-notification-sound";

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
const READ_ORDERS_KEY = "chamou:read-orders";

// ─── Helper: localStorage for read state ─────────────────────────────────────

function getReadOrders(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(READ_ORDERS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function markOrderAsRead(orderId: string) {
  if (typeof window === "undefined") return;
  try {
    const readOrders = getReadOrders();
    readOrders.add(orderId);
    localStorage.setItem(READ_ORDERS_KEY, JSON.stringify([...readOrders]));
  } catch {
    // localStorage não disponível - ignora
  }
}

function markAllOrdersAsRead(orderIds: string[]) {
  if (typeof window === "undefined") return;
  try {
    const readOrders = getReadOrders();
    orderIds.forEach((id) => readOrders.add(id));
    localStorage.setItem(READ_ORDERS_KEY, JSON.stringify([...readOrders]));
  } catch {
    // localStorage não disponível - ignora
  }
}

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
  const [readOrders, setReadOrders] = useState<Set<string>>(() => getReadOrders());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const printConfirmation = usePrintConfirmation();
  const notificationSound = useNotificationSound();

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

  // ─── Notification Sound Control ─────────────────────────────────────────

  // Calcula quantos pedidos não lidos existem
  const unreadCount = orders.filter((o) => !readOrders.has(o.id)).length;

  // Toca som em loop se há pedidos não lidos, para quando todos foram lidos
  useEffect(() => {
    if (unreadCount > 0) {
      notificationSound.play();
    } else {
      notificationSound.stop();
    }
    // Cleanup: para o som quando componente desmonta
    return () => {
      notificationSound.stop();
    };
  }, [unreadCount, notificationSound]);

  // ─── Mark as Read ────────────────────────────────────────────────────────

  const handleMarkAllAsRead = useCallback(() => {
    const orderIds = orders.map((o) => o.id);
    markAllOrdersAsRead(orderIds);
    setReadOrders(getReadOrders());
    notificationSound.stop();
  }, [orders, notificationSound]);

  const handleViewOrder = useCallback((orderId: string) => {
    markOrderAsRead(orderId);
    setReadOrders(getReadOrders());
    setSelectedOrderId(orderId);
  }, []);

  // ─── Inline confirm action ───────────────────────────────────────────────

  async function confirmOrder(order: PendingOrder) {
    // Marca como lido e para o som ao confirmar
    markOrderAsRead(order.id);
    setReadOrders(getReadOrders());

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

      // Auto-print after confirm with confirmation modal
      if (updated) {
        printConfirmation.startPrint(() => printOrder(updated as unknown as PrintOrder));
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
          // Marca como lido ao confirmar/recusar do modal
          markOrderAsRead(id);
          setReadOrders(getReadOrders());
          setOrders((prev) => prev.filter((o) => o.id !== id));
          setSelectedOrderId(null);
        }}
      />

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 ${unreadCount > 0 ? "animate-pulse" : ""}`}
            >
              <BellRing className="h-4 w-4 text-amber-600" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">Pedidos pendentes</h2>
              <p className="text-xs text-neutral-400">Atualiza a cada 8s</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-amber-600 hover:text-amber-700 hover:underline"
                title="Marcar todos como lidos"
              >
                Marcar como lido
              </button>
            )}
            {orders.length > 0 && (
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${unreadCount > 0 ? "animate-pulse bg-red-500" : "bg-amber-500"}`}
              >
                {unreadCount > 0 ? unreadCount : orders.length}
              </span>
            )}
          </div>
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
              const isUnread = !readOrders.has(order.id);
              return (
                <li
                  key={order.id}
                  className={`flex items-center gap-3 px-5 py-3 transition-colors hover:bg-neutral-50 ${isUnread ? "bg-amber-50/50" : ""}`}
                >
                  {/* Unread indicator */}
                  {isUnread && (
                    <div
                      className="h-2 w-2 animate-pulse rounded-full bg-red-500"
                      aria-hidden="true"
                    />
                  )}

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
                      onClick={() => handleViewOrder(order.id)}
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

      {/* Print Confirmation Modal */}
      <PrintConfirmationModal
        open={printConfirmation.isOpen}
        onOpenChange={printConfirmation.handleCancel}
        onConfirm={printConfirmation.handleConfirm}
        onRetry={printConfirmation.handleRetry}
      />
    </>
  );
}
