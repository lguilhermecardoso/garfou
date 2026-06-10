"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { Button } from "@/components/ui/button";

import {
  Loader2,
  RefreshCw,
  ChefHat,
  CheckCheck,
  Truck,
  UtensilsCrossed,
  ShoppingBag,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useRef, useCallback, useState } from "react";

// ─── SLA Configuration ────────────────────────────────────────────────────────
/** Target kitchen-ready time in minutes, by order type */
const SLA_TARGETS: Record<string, number> = {
  DELIVERY: 20,
  DINE_IN: 18,
  TAKEOUT: 12,
};
const SLA_DEFAULT = 18;

type Urgency = "ok" | "warning" | "critical" | "overdue";

function getSlaTarget(orderType: string): number {
  return SLA_TARGETS[orderType] ?? SLA_DEFAULT;
}

function getUrgency(elapsedMin: number, targetMin: number): Urgency {
  const pct = elapsedMin / targetMin;
  if (pct >= 1) return "overdue";
  if (pct >= 0.85) return "critical";
  if (pct >= 0.6) return "warning";
  return "ok";
}

const URGENCY_ORDER: Record<Urgency, number> = { overdue: 0, critical: 1, warning: 2, ok: 3 };

// ─── Order type display ────────────────────────────────────────────────────────
const ORDER_TYPE_META: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  DELIVERY: { label: "Delivery", Icon: Truck, color: "text-blue-400" },
  DINE_IN: { label: "Mesa", Icon: UtensilsCrossed, color: "text-emerald-400" },
  TAKEOUT: { label: "Retirada", Icon: ShoppingBag, color: "text-purple-400" },
};

interface Props {
  restaurantId: string;
  bearerToken?: string; // Se fornecido, usa BFF
}

/**
 * KitchenScreen
 *
 * Full-screen KDS (Kitchen Display System) with:
 * - Live polling at 3s intervals
 * - SLA timer per order: OK → WARNING → CRITICAL → OVERDUE
 * - Order type badges: Delivery / Mesa / Retirada
 * - Cards sorted by urgency (most delayed first within each status group)
 * - Audio alert on new orders
 */

async function fetchKitchenOrders(restaurantId: string, bearerToken?: string) {
  if (bearerToken) {
    // BFF mode
    const res = await fetch(
      `/api/bff/orders?status=NOVO_PEDIDO,AGUARDANDO_CONFIRMACAO,CONFIRMADO,EM_PREPARO`,
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
        cache: "no-store",
      }
    );
    if (!res.ok) throw new Error("Falha ao carregar pedidos");
    const json = await res.json();
    return json.data as KitchenOrder[];
  } else {
    // Normal mode (via NextAuth)
    const res = await fetch(
      `/api/restaurants/${restaurantId}/orders?status=NOVO_PEDIDO,AGUARDANDO_CONFIRMACAO,CONFIRMADO,EM_PREPARO`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error("Falha ao carregar pedidos");
    const json = await res.json();
    return json.orders as KitchenOrder[];
  }
}

async function updateOrderStatus(
  restaurantId: string,
  orderId: string,
  status: string,
  bearerToken?: string
) {
  if (bearerToken) {
    // BFF mode
    const res = await fetch(`/api/bff/orders/${orderId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Falha ao atualizar pedido");
    return res.json();
  } else {
    // Normal mode (via NextAuth)
    const res = await fetch(`/api/restaurants/${restaurantId}/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Falha ao atualizar pedido");
    return res.json();
  }
}

interface KitchenOrder {
  id: string;
  orderNumber: number;
  status: string;
  tableNumber: string | null;
  type: string;
  notes: string | null;
  createdAt: string;
  items: {
    id: string;
    quantity: number;
    notes: string | null;
    product: { name: string };
    addons: { quantity: number; addon: { name: string } }[];
  }[];
}

export default function KitchenScreen({ restaurantId, bearerToken }: Props) {
  const queryClient = useQueryClient();
  const prevCountRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 10_000);
    return () => clearInterval(timer);
  }, []);

  const {
    data: orders = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["kitchen-orders", restaurantId, bearerToken ? "bff" : "auth"],
    queryFn: () => fetchKitchenOrders(restaurantId, bearerToken),
    refetchInterval: 3000, // Poll every 3 seconds
    staleTime: 2000,
  });

  const playAlert = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.95, ctx.currentTime); // MUITO ALTO
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch {
      // Audio not supported — silent fail
    }
  }, []);

  // Play alert sound on new orders
  useEffect(() => {
    if (orders.length > prevCountRef.current && prevCountRef.current > 0) {
      playAlert();
    }
    prevCountRef.current = orders.length;
  }, [orders.length, playAlert]);

  const { mutate: updateStatus, isPending } = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      updateOrderStatus(restaurantId, orderId, status, bearerToken),
    onMutate: async ({ orderId, status }) => {
      const queryKey = ["kitchen-orders", restaurantId, bearerToken ? "bff" : "auth"];
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<KitchenOrder[]>(queryKey);
      queryClient.setQueryData<KitchenOrder[]>(
        queryKey,
        (old) =>
          old
            ?.map((o) => (o.id === orderId ? { ...o, status } : o))
            .filter((o) =>
              ["NOVO_PEDIDO", "AGUARDANDO_CONFIRMACAO", "CONFIRMADO", "EM_PREPARO"].includes(
                o.status
              )
            ) ?? []
      );
      return { prev, queryKey };
    },
    onSuccess: (_, { status }) => {
      const statusLabel =
        status === "EM_PREPARO" ? "em preparo" : status === "PRONTO" ? "pronto" : "atualizado";
      toast.success(`Pedido ${statusLabel}!`);
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev && ctx?.queryKey) {
        queryClient.setQueryData(ctx.queryKey, ctx.prev);
      }
      toast.error("Erro ao atualizar pedido.");
    },
    onSettled: () => {
      const queryKey = ["kitchen-orders", restaurantId, bearerToken ? "bff" : "auth"];
      queryClient.invalidateQueries({ queryKey });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-white" aria-label="Carregando..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-neutral-950 text-white">
        <p className="text-lg font-semibold text-red-400">Erro ao carregar pedidos</p>
        <Button
          variant="outline"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] })}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  const confirmedOrders = orders.filter((o) => o.status === "CONFIRMADO");
  const inPreparationOrders = orders.filter((o) => o.status === "EM_PREPARO");
  const newOrders = orders.filter(
    (o) => o.status === "NOVO_PEDIDO" || o.status === "AGUARDANDO_CONFIRMACAO"
  );

  // Sort each group by urgency — most delayed first
  function sortByUrgency(list: KitchenOrder[]) {
    return [...list].sort((a, b) => {
      const elA = Math.floor((nowMs - new Date(a.createdAt).getTime()) / 60000);
      const elB = Math.floor((nowMs - new Date(b.createdAt).getTime()) / 60000);
      const uA = URGENCY_ORDER[getUrgency(elA, getSlaTarget(a.type))];
      const uB = URGENCY_ORDER[getUrgency(elB, getSlaTarget(b.type))];
      if (uA !== uB) return uA - uB; // most urgent first
      return elB - elA; // then by elapsed time descending
    });
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <ChefHat className="text-accent-400 h-7 w-7" aria-hidden="true" />
          <div>
            <h1 className="text-xl font-bold">Tela da Cozinha</h1>
            <p className="text-xs text-neutral-400">
              {orders.length} pedido{orders.length !== 1 ? "s" : ""} ativo
              {orders.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex h-2 w-2 animate-pulse rounded-full bg-emerald-400"
            aria-label="Conectado"
          />
          <span className="text-xs text-neutral-400">Ao vivo</span>
        </div>
      </header>

      {orders.length === 0 ? (
        <div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center gap-4">
          <CheckCheck className="h-16 w-16 text-emerald-400" aria-hidden="true" />
          <p className="text-xl font-semibold text-neutral-300">Nenhum pedido pendente</p>
          <p className="text-neutral-500">Ótimo trabalho! Aguardando novos pedidos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* New — need confirmation */}
          {sortByUrgency(newOrders).map((order) => (
            <KitchenCard
              key={order.id}
              order={order}
              nowMs={nowMs}
              onConfirm={() => updateStatus({ orderId: order.id, status: "CONFIRMADO" })}
              onCancel={() => updateStatus({ orderId: order.id, status: "CANCELADO" })}
              onStartPrep={() => updateStatus({ orderId: order.id, status: "EM_PREPARO" })}
              onReady={() => updateStatus({ orderId: order.id, status: "PRONTO" })}
              isPending={isPending}
            />
          ))}
          {/* Confirmed — need to start prep */}
          {sortByUrgency(confirmedOrders).map((order) => (
            <KitchenCard
              key={order.id}
              order={order}
              nowMs={nowMs}
              onStartPrep={() => updateStatus({ orderId: order.id, status: "EM_PREPARO" })}
              onReady={() => updateStatus({ orderId: order.id, status: "PRONTO" })}
              isPending={isPending}
            />
          ))}
          {/* In preparation */}
          {sortByUrgency(inPreparationOrders).map((order) => (
            <KitchenCard
              key={order.id}
              order={order}
              nowMs={nowMs}
              onStartPrep={() => updateStatus({ orderId: order.id, status: "EM_PREPARO" })}
              onReady={() => updateStatus({ orderId: order.id, status: "PRONTO" })}
              isPending={isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function KitchenCard({
  order,
  nowMs,
  onConfirm,
  onCancel,
  onStartPrep,
  onReady,
  isPending,
}: {
  order: KitchenOrder;
  nowMs: number;
  onConfirm?: () => void;
  onCancel?: () => void;
  onStartPrep: () => void;
  onReady: () => void;
  isPending: boolean;
}) {
  const isAwaitingConfirmation =
    order.status === "NOVO_PEDIDO" || order.status === "AGUARDANDO_CONFIRMACAO";
  const isConfirmed = order.status === "CONFIRMADO";
  const elapsedMinutes = Math.floor((nowMs - new Date(order.createdAt).getTime()) / 60000);
  const slaTarget = getSlaTarget(order.type);
  const urgency = getUrgency(elapsedMinutes, slaTarget);
  const progressPct = Math.min((elapsedMinutes / slaTarget) * 100, 100);

  // If order is awaiting confirmation it always gets the red "NOVO" treatment
  const effectiveUrgency: Urgency = isAwaitingConfirmation ? "overdue" : urgency;

  const typeMeta = ORDER_TYPE_META[order.type] ?? ORDER_TYPE_META.DINE_IN;
  const TypeIcon = typeMeta.Icon;

  const cardBorder: Record<Urgency, string> = {
    ok: "border-neutral-700",
    warning: "border-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.25)]",
    critical: "border-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.3)]",
    overdue: "border-red-500 shadow-[0_0_22px_rgba(239,68,68,0.4)]",
  };

  const progressColor: Record<Urgency, string> = {
    ok: "bg-emerald-500",
    warning: "bg-yellow-500",
    critical: "bg-orange-500",
    overdue: "bg-red-500",
  };

  return (
    <article
      className={`relative rounded-xl border-2 bg-neutral-900 transition-all ${
        cardBorder[effectiveUrgency]
      } ${effectiveUrgency === "critical" || isAwaitingConfirmation ? "animate-pulse" : ""}`}
      aria-label={`Pedido #${order.orderNumber}`}
    >
      {/* SLA progress bar — top of card */}
      <div className="h-1.5 w-full overflow-hidden rounded-t-xl bg-neutral-800">
        <div
          className={`h-full transition-all duration-1000 ${progressColor[effectiveUrgency]}`}
          style={{ width: `${progressPct}%` }}
          aria-hidden="true"
        />
      </div>

      <div className="p-4">
        {/* Header row */}
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-2xl font-bold">#{order.orderNumber}</span>
              {isAwaitingConfirmation && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                  NOVO!
                </span>
              )}
              {isConfirmed && (
                <span className="bg-accent-400 rounded-full px-2 py-0.5 text-xs font-bold text-neutral-900">
                  CONFIRMADO
                </span>
              )}
              {/* Delay badge */}
              {effectiveUrgency === "overdue" && !isAwaitingConfirmation && (
                <span className="flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-400">
                  <AlertTriangle className="h-3 w-3" />
                  ATRASADO {elapsedMinutes - slaTarget}min
                </span>
              )}
              {effectiveUrgency === "critical" && (
                <span className="rounded-full border border-orange-500/40 bg-orange-500/20 px-2 py-0.5 text-xs font-bold text-orange-400">
                  URGENTE
                </span>
              )}
            </div>

            {/* Order type + table */}
            <div className="mt-1 flex items-center gap-2">
              <TypeIcon className={`h-3.5 w-3.5 ${typeMeta.color}`} aria-hidden="true" />
              <span className={`text-xs font-medium ${typeMeta.color}`}>{typeMeta.label}</span>
              {order.tableNumber && (
                <span className="text-xs text-neutral-400">· Mesa {order.tableNumber}</span>
              )}
            </div>
          </div>

          {/* Timer */}
          <div className="ml-2 shrink-0 text-right">
            <OrderStatusBadge status={order.status} />
            <div
              className={`mt-1 flex items-center justify-end gap-1 text-xs ${
                effectiveUrgency === "ok"
                  ? "text-neutral-500"
                  : effectiveUrgency === "warning"
                    ? "text-yellow-400"
                    : effectiveUrgency === "critical"
                      ? "text-orange-400"
                      : "text-red-400"
              }`}
            >
              <Clock className="h-3 w-3" aria-hidden="true" />
              <span>
                {elapsedMinutes}min / {slaTarget}min
              </span>
            </div>
          </div>
        </div>

        {/* Items */}
        <ul className="mb-4 space-y-2" aria-label="Itens do pedido">
          {order.items.map((item) => (
            <li key={item.id} className="rounded-lg bg-neutral-800 p-3">
              <div className="flex items-baseline gap-2">
                <span className="text-accent-400 text-lg font-bold">{item.quantity}×</span>
                <span className="font-medium">{item.product.name}</span>
              </div>
              {item.addons.length > 0 && (
                <ul className="mt-1 ml-6 space-y-0.5">
                  {item.addons.map((a, i) => (
                    <li key={i} className="text-xs text-neutral-400">
                      + {a.quantity}× {a.addon.name}
                    </li>
                  ))}
                </ul>
              )}
              {item.notes && (
                <p className="mt-1 ml-6 text-xs text-yellow-400 italic">⚠ {item.notes}</p>
              )}
            </li>
          ))}
        </ul>

        {order.notes && (
          <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-2">
            <p className="text-xs text-yellow-400">
              <strong>Obs:</strong> {order.notes}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {isAwaitingConfirmation ? (
            <>
              <Button
                className="flex-1 bg-emerald-500 font-bold hover:bg-emerald-400"
                onClick={onConfirm}
                disabled={isPending}
              >
                Confirmar
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-red-500 font-bold text-red-400 hover:bg-red-500/10"
                onClick={onCancel}
                disabled={isPending}
              >
                Rejeitar
              </Button>
            </>
          ) : isConfirmed ? (
            <Button
              className="bg-accent-500 hover:bg-accent-400 flex-1 font-bold text-neutral-900"
              onClick={onStartPrep}
              disabled={isPending}
            >
              Iniciar preparo
            </Button>
          ) : (
            <Button
              className="flex-1 bg-emerald-500 font-bold hover:bg-emerald-400"
              onClick={onReady}
              disabled={isPending}
            >
              <CheckCheck className="mr-1 h-4 w-4" aria-hidden="true" />
              Pronto!
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
