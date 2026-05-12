"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { Button } from "@/components/ui/button";

import { Loader2, RefreshCw, ChefHat, CheckCheck } from "lucide-react";
import { useEffect, useRef, useCallback, useState } from "react";

interface Props {
  restaurantId: string;
}

async function fetchKitchenOrders(restaurantId: string) {
  const res = await fetch(
    `/api/restaurants/${restaurantId}/orders?status=NOVO_PEDIDO,AGUARDANDO_CONFIRMACAO,CONFIRMADO,EM_PREPARO`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Falha ao carregar pedidos");
  const json = await res.json();
  return json.orders as KitchenOrder[];
}

async function updateOrderStatus(restaurantId: string, orderId: string, status: string) {
  const res = await fetch(`/api/restaurants/${restaurantId}/orders/${orderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Falha ao atualizar pedido");
  return res.json();
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

export default function KitchenScreen({ restaurantId }: Props) {
  const queryClient = useQueryClient();
  const prevCountRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const {
    data: orders = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["kitchen-orders", restaurantId],
    queryFn: () => fetchKitchenOrders(restaurantId),
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
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
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
      updateOrderStatus(restaurantId, orderId, status),
    onMutate: async ({ orderId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["kitchen-orders", restaurantId] });
      const prev = queryClient.getQueryData<KitchenOrder[]>(["kitchen-orders", restaurantId]);
      queryClient.setQueryData<KitchenOrder[]>(
        ["kitchen-orders", restaurantId],
        (old) =>
          old
            ?.map((o) => (o.id === orderId ? { ...o, status } : o))
            .filter((o) =>
              ["NOVO_PEDIDO", "AGUARDANDO_CONFIRMACAO", "CONFIRMADO", "EM_PREPARO"].includes(
                o.status
              )
            ) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(["kitchen-orders", restaurantId], ctx.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders", restaurantId] });
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
          {newOrders.map((order) => (
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
          {confirmedOrders.map((order) => (
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
          {inPreparationOrders.map((order) => (
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
  const isNew = order.status === "CONFIRMADO";
  const elapsedMinutes = Math.floor((nowMs - new Date(order.createdAt).getTime()) / 60000);

  return (
    <article
      className={`rounded-xl border-2 p-4 transition-all ${
        isAwaitingConfirmation
          ? "animate-pulse-border border-red-500 bg-neutral-900 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
          : isNew
            ? "border-accent-400 bg-neutral-900 shadow-[0_0_20px_rgba(245,155,5,0.2)]"
            : "border-neutral-700 bg-neutral-900"
      }`}
      aria-label={`Pedido #${order.orderNumber}`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">#{order.orderNumber}</span>
            {isAwaitingConfirmation && (
              <span className="animate-pulse rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                NOVO!
              </span>
            )}
            {isNew && (
              <span className="bg-accent-400 animate-pulse rounded-full px-2 py-0.5 text-xs font-bold text-neutral-900">
                NOVO
              </span>
            )}
          </div>
          {order.tableNumber && (
            <p className="text-sm text-neutral-400">Mesa {order.tableNumber}</p>
          )}
        </div>
        <div className="text-right">
          <OrderStatusBadge status={order.status} />
          <p
            className={`mt-1 text-xs ${elapsedMinutes > 15 ? "text-red-400" : "text-neutral-500"}`}
          >
            {elapsedMinutes}min atrás
          </p>
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
        ) : isNew ? (
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
    </article>
  );
}
