"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

const POLL_MS = 8_000;
const PENDING_STATUSES = "NOVO_PEDIDO,AGUARDANDO_CONFIRMACAO";

function playDoorbell() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // Web Audio API not available
  }
}

/**
 * Polls for pending orders globally and fires a Sonner toast whenever a new
 * order arrives. Meant to be mounted once per restaurant session (e.g. in the
 * dashboard layout) so the alert fires on every page.
 */
export function useNewOrderAlert(restaurantId: string) {
  const prevCount = useRef<number | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!restaurantId) return;

    async function poll() {
      try {
        const res = await fetch(
          `/api/restaurants/${restaurantId}/orders?status=${PENDING_STATUSES}&pageSize=1`
        );
        if (!res.ok) return;
        const data = await res.json();
        const count: number = data.total ?? 0;

        if (!isFirstLoad.current && prevCount.current !== null && count > prevCount.current) {
          const delta = count - prevCount.current;
          playDoorbell();
          toast(
            `🔔 ${delta === 1 ? "Novo pedido recebido!" : `${delta} novos pedidos recebidos!`}`,
            {
              description: "Acesse Pedidos para confirmar.",
              duration: 8000,
              action: {
                label: "Ver pedidos",
                onClick: () => {
                  window.location.href = `/dashboard/${restaurantId}/orders?status=NOVO_PEDIDO`;
                },
              },
            }
          );
        }

        isFirstLoad.current = false;
        prevCount.current = count;
      } catch {
        // ignore network errors on background polls
      }
    }

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, [restaurantId]);
}
