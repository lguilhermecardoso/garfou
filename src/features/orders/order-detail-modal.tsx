/**
 * OrderDetailModal
 *
 * Full-screen dialog that shows the details of a single order in a receipt
 * format (Bematech MP-4200 TH FI style) and exposes approve / reject actions.
 *
 * Features:
 *  - Fetches the order via GET /api/restaurants/:rId/orders/:orderId on open
 *  - Shows a skeleton loader while fetching
 *  - Renders <OrderPrintReceipt> once data is available
 *  - "Confirmar" button: PATCH status → CONFIRMADO  (only for pending orders)
 *  - "Cancelar"  button: PATCH status → CANCELADO   (only for pending orders)
 *  - "Imprimir"  button: calls printOrder() helper — available for all statuses
 *  - Fires onStatusChange(orderId, newStatus) after a successful PATCH so the
 *    parent list can update without a full refetch
 *  - Accessible: focus-trapped, ESC closes, aria-modal + role="dialog"
 *
 * Props:
 *  @param orderId       — UUID of the order to display; pass null to close
 *  @param restaurantId  — Restaurant UUID used in API calls
 *  @param onClose       — Called when the dialog should be closed
 *  @param onStatusChange — Optional callback(orderId, newStatus) after PATCH
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { OrderPrintReceipt, printOrder } from "./order-print-receipt";
import type { PrintOrder } from "./order-print-receipt";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle, XCircle, Printer, X, RefreshCw, AlertCircle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  /** Order UUID to display, or null when the modal is closed */
  orderId: string | null;
  restaurantId: string;
  onClose: () => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
}

const PENDING_STATUSES = new Set(["NOVO_PEDIDO", "AGUARDANDO_CONFIRMACAO"]);

// ─── Component ────────────────────────────────────────────────────────────────

export function OrderDetailModal({ orderId, restaurantId, onClose, onStatusChange }: Props) {
  const [order, setOrder] = useState<(PrintOrder & { id: string; status: string }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<"confirm" | "cancel" | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Fetch order details
  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setOrder(null);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/orders/${orderId}`);
      if (!res.ok) throw new Error("Pedido não encontrado");
      const json = await res.json();
      setOrder(json.data ?? json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar pedido");
    } finally {
      setLoading(false);
    }
  }, [orderId, restaurantId]);

  useEffect(() => {
    if (orderId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchOrder();
    }
  }, [orderId, fetchOrder]);

  // Focus close button when opened
  useEffect(() => {
    if (orderId) {
      requestAnimationFrame(() => closeButtonRef.current?.focus());
    }
  }, [orderId]);

  // ESC closes
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (orderId) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [orderId, onClose]);

  // Lock scroll
  useEffect(() => {
    if (orderId) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [orderId]);

  if (!orderId) return null;

  // ─── Actions ──────────────────────────────────────────────────────────────

  async function patchStatus(newStatus: string, kind: "confirm" | "cancel") {
    if (!order) return;
    setActioning(kind);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Falha ao atualizar status");
      setOrder((prev) => (prev ? { ...prev, status: newStatus } : prev));
      onStatusChange?.(order.id, newStatus);

      // Auto-print on confirm
      if (kind === "confirm" && order) {
        printOrder({ ...order, status: newStatus });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar");
    } finally {
      setActioning(null);
    }
  }

  const isPending = order ? PENDING_STATUSES.has(order.status) : false;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    /* Overlay */
    <div
      ref={overlayRef}
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={order ? `Pedido #${order.orderNumber}` : "Detalhe do pedido"}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-neutral-50 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-2xl border-b border-neutral-200 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-neutral-900">
              {order ? `Pedido #${order.orderNumber}` : "Pedido"}
            </h2>
            {order && <OrderStatusBadge status={order.status} />}
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
              <button onClick={fetchOrder} className="ml-auto text-xs underline hover:no-underline">
                Tentar novamente
              </button>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="flex flex-col items-center gap-3 py-12 text-neutral-400">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="text-sm">Carregando pedido...</span>
            </div>
          )}

          {/* Receipt preview */}
          {!loading && order && <OrderPrintReceipt order={order} />}
        </div>

        {/* Footer actions */}
        {!loading && order && (
          <div className="rounded-b-2xl border-t border-neutral-200 bg-white px-5 py-4">
            <div className="flex justify-end gap-2">
              {/* Print — always available */}
              <button
                onClick={() => printOrder(order)}
                className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                <Printer className="h-4 w-4" aria-hidden="true" />
                Imprimir
              </button>

              {/* Actions — only for pending orders */}
              {isPending && (
                <>
                  <button
                    onClick={() => patchStatus("CANCELADO", "cancel")}
                    disabled={!!actioning}
                    className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                  >
                    {actioning === "cancel" ? (
                      <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                    )}
                    Recusar
                  </button>

                  <button
                    onClick={() => patchStatus("CONFIRMADO", "confirm")}
                    disabled={!!actioning}
                    className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-600 disabled:opacity-50"
                  >
                    {actioning === "confirm" ? (
                      <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <CheckCircle className="h-4 w-4" aria-hidden="true" />
                    )}
                    Confirmar e Imprimir
                  </button>
                </>
              )}
            </div>

            {/* Summary row */}
            <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
              <span>
                {order.items.length} ite{order.items.length === 1 ? "m" : "ns"}
              </span>
              <span className="text-sm font-semibold text-neutral-900">
                Total: {formatCurrency(order.total)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
