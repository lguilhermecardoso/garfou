"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { OrderDetailModal } from "./order-detail-modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  CheckCheck,
  Truck,
  MessageCircle,
  ClipboardPlus,
} from "lucide-react";
import { ManualOrderModal } from "./manual-order-modal";

const WA_MESSAGES: Partial<Record<string, string>> = {
  CONFIRMADO: "Olá {{name}}! Seu pedido #{{num}} foi confirmado ✅ Em breve estará pronto!",
  EM_PREPARO: "Olá {{name}}! Seu pedido #{{num}} está sendo preparado 👨‍🍳",
  PRONTO: "Olá {{name}}! Seu pedido #{{num}} está pronto! 🎉",
  SAIU_PARA_ENTREGA: "Olá {{name}}! Seu pedido #{{num}} saiu para entrega 🛵 Já já chega!",
  FINALIZADO: "Olá {{name}}! Seu pedido #{{num}} foi entregue. Bom apetite! 😄",
  CANCELADO:
    "Olá {{name}}! Seu pedido #{{num}} foi cancelado. Entre em contato para mais informações.",
};

function buildWaHref(phone: string, name: string, num: number, status: string) {
  const template =
    WA_MESSAGES[status] ??
    "Olá {{name}}! Atualizamos o status do seu pedido #{{num}}. Qualquer dúvida estamos aqui.";
  const text = template.replace("{{name}}", name).replace("{{num}}", String(num));
  const clean = phone.replace(/\D/g, "");
  return `https://wa.me/55${clean}?text=${encodeURIComponent(text)}`;
}

interface Order {
  id: string;
  orderNumber: number;
  status: string;
  type: string;
  tableNumber: string | null;
  deliveryAddress?: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  } | null;
  total: number;
  createdAt: string;
  items: unknown[];
  customer: { id: string; name: string; phone: string | null } | null;
}

interface Props {
  restaurantId: string;
  initialStatus?: string;
}

const STATUS_LABELS: Record<string, string> = {
  NOVO_PEDIDO: "Novo Pedido",
  AGUARDANDO_CONFIRMACAO: "Aguardando",
  CONFIRMADO: "Confirmado",
  EM_PREPARO: "Em preparo",
  PRONTO: "Pronto",
  SAIU_PARA_ENTREGA: "Saiu p/ entrega",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

const ALL_STATUSES = Object.keys(STATUS_LABELS);

function playDoorbell() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.95, ctx.currentTime); // MUITO ALTO
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // Web Audio not available
  }
}

export function OrdersLiveTable({ restaurantId, initialStatus }: Props) {
  const [statusFilter, setStatusFilter] = useState(initialStatus ?? "");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const knownIds = useRef<Set<string>>(new Set());

  const fetchOrders = useCallback(async () => {
    const qs = statusFilter ? `?status=${statusFilter}` : "";
    const res = await fetch(`/api/restaurants/${restaurantId}/orders${qs}`);
    if (!res.ok) return;
    const data = await res.json();
    const fetched: Order[] = data.orders ?? data.data ?? [];

    // detect new orders and play sound
    const newOnes = fetched.filter(
      (o) =>
        (o.status === "NOVO_PEDIDO" || o.status === "AGUARDANDO_CONFIRMACAO") &&
        !knownIds.current.has(o.id)
    );
    if (newOnes.length > 0 && knownIds.current.size > 0) {
      playDoorbell();
    }
    fetched.forEach((o) => knownIds.current.add(o.id));

    setOrders(fetched);
    setLoading(false);
  }, [restaurantId, statusFilter]);

  useEffect(() => {
    knownIds.current = new Set();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  async function patchStatus(orderId: string, status: string) {
    setActioning(orderId);
    await fetch(`/api/restaurants/${restaurantId}/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setActioning(null);
    fetchOrders();
  }

  return (
    <>
      {/* Manual retroactive order modal */}
      <ManualOrderModal
        restaurantId={restaurantId}
        open={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        onSuccess={() => {
          setManualModalOpen(false);
          fetchOrders();
        }}
      />
      {/* Order detail modal */}
      <OrderDetailModal
        orderId={selectedOrderId}
        restaurantId={restaurantId}
        onClose={() => setSelectedOrderId(null)}
        onStatusChange={(id, newStatus) => {
          setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)));
        }}
      />

      <div className="space-y-4">
        {/* Top bar: filter pills + manual order button */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter("")}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${statusFilter === "" ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
            >
              Todos
            </button>
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${statusFilter === s ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <button
            onClick={() => setManualModalOpen(true)}
            className="hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 flex shrink-0 items-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors"
          >
            <ClipboardPlus className="h-4 w-4" />
            Lançar retroativo
          </button>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-neutral-400">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Carregando pedidos...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Lista de pedidos">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50">
                    <th className="px-4 py-3 text-left font-semibold text-neutral-600">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-600">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-600">Tipo</th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-600">Cliente</th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-600">
                      Mesa / Endereço
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-600">Itens</th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-600">Total</th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-600">Data</th>
                    <th className="px-4 py-3 text-center font-semibold text-neutral-600">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-neutral-400">
                        Nenhum pedido encontrado
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => {
                      const isPending =
                        order.status === "NOVO_PEDIDO" || order.status === "AGUARDANDO_CONFIRMACAO";
                      const isReady = order.status === "PRONTO";
                      const isOutForDelivery = order.status === "SAIU_PARA_ENTREGA";
                      const isDelivery = order.type === "DELIVERY";
                      return (
                        <tr
                          key={order.id}
                          className={`border-b border-neutral-50 transition-colors ${isPending ? "bg-amber-50 hover:bg-amber-100" : isReady ? "bg-emerald-50 hover:bg-emerald-100" : isOutForDelivery ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-neutral-50"}`}
                        >
                          <td className="px-4 py-3 font-mono text-neutral-600">
                            #{order.orderNumber}
                          </td>
                          <td className="px-4 py-3">
                            <OrderStatusBadge status={order.status} />
                          </td>
                          <td className="px-4 py-3 text-neutral-600">
                            {order.type.replace(/_/g, " ")}
                          </td>
                          <td className="px-4 py-3 text-neutral-600">
                            {order.customer?.name ?? <span className="text-neutral-400">—</span>}
                          </td>
                          <td className="px-4 py-3 text-neutral-600">
                            {order.type === "DELIVERY" && order.deliveryAddress ? (
                              <span className="text-xs leading-tight">
                                {[
                                  order.deliveryAddress.street && order.deliveryAddress.number
                                    ? `${order.deliveryAddress.street}, ${order.deliveryAddress.number}`
                                    : order.deliveryAddress.street,
                                  order.deliveryAddress.neighborhood,
                                  order.deliveryAddress.city,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            ) : (
                              (order.tableNumber ?? "—")
                            )}
                          </td>
                          <td className="px-4 py-3 text-neutral-600">{order.items.length}</td>
                          <td className="px-4 py-3 font-semibold text-neutral-900">
                            {formatCurrency(order.total)}
                          </td>
                          <td className="px-4 py-3 text-neutral-500">
                            {formatDate(new Date(order.createdAt))}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center gap-1">
                              {/* View — always available */}
                              <button
                                onClick={() => setSelectedOrderId(order.id)}
                                title="Ver pedido"
                                className="rounded-lg bg-neutral-100 p-1.5 text-neutral-600 transition-colors hover:bg-neutral-200"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {/* Quick approve / reject for pending */}
                              {isPending && (
                                <>
                                  <button
                                    onClick={() => patchStatus(order.id, "CONFIRMADO")}
                                    disabled={actioning === order.id}
                                    title="Confirmar pedido"
                                    className="rounded-lg bg-green-500 p-1.5 text-white transition-colors hover:bg-green-600 disabled:opacity-50"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => patchStatus(order.id, "CANCELADO")}
                                    disabled={actioning === order.id}
                                    title="Cancelar pedido"
                                    className="rounded-lg bg-red-500 p-1.5 text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              {/* Out for delivery for ready delivery orders */}
                              {isReady && isDelivery && (
                                <button
                                  onClick={() => patchStatus(order.id, "SAIU_PARA_ENTREGA")}
                                  disabled={actioning === order.id}
                                  title="Marcar como saiu para entrega"
                                  className="rounded-lg bg-blue-500 p-1.5 text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                                >
                                  <Truck className="h-4 w-4" />
                                </button>
                              )}
                              {/* Finalize for ready orders (non-delivery) or out for delivery */}
                              {(isReady && !isDelivery) || isOutForDelivery ? (
                                <button
                                  onClick={() => patchStatus(order.id, "FINALIZADO")}
                                  disabled={actioning === order.id}
                                  title="Finalizar pedido"
                                  className="rounded-lg bg-emerald-500 p-1.5 text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                                >
                                  <CheckCheck className="h-4 w-4" />
                                </button>
                              ) : null}
                              {/* WhatsApp quick-send */}
                              {order.customer?.phone && (
                                <a
                                  href={buildWaHref(
                                    order.customer.phone,
                                    order.customer.name,
                                    order.orderNumber,
                                    order.status
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={`Enviar WhatsApp para ${order.customer.name}`}
                                  className="rounded-lg bg-green-100 p-1.5 text-green-700 transition-colors hover:bg-green-200"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="text-right text-xs text-neutral-400">Atualização automática a cada 5s</p>
      </div>
    </>
  );
}
