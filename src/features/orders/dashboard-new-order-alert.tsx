"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

interface Props {
  restaurantId: string;
  initialCount: number;
}

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

export function DashboardNewOrderAlert({ restaurantId, initialCount }: Props) {
  const prevCount = useRef(initialCount);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/restaurants/${restaurantId}/orders?status=NOVO_PEDIDO,AGUARDANDO_CONFIRMACAO&pageSize=1`
        );
        if (!res.ok) return;
        const data = await res.json();
        const count: number = data.total ?? 0;

        if (!isFirstRender.current && count > prevCount.current) {
          playDoorbell();
        }
        isFirstRender.current = false;
        prevCount.current = count;
      } catch {
        // network error - ignore
      }
    };

    poll();
    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, [restaurantId]);

  if (initialCount === 0) return null;

  return (
    <Link
      href={`/dashboard/${restaurantId}/orders?status=NOVO_PEDIDO`}
      className="flex items-center gap-3 rounded-2xl border-2 border-amber-400 bg-amber-50 px-5 py-4 transition-colors hover:bg-amber-100"
    >
      <div className="flex h-10 w-10 animate-pulse items-center justify-center rounded-xl bg-amber-400 text-white">
        <Bell className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <p className="font-semibold text-amber-900">
          {initialCount} novo{initialCount > 1 ? "s" : ""} pedido{initialCount > 1 ? "s" : ""}{" "}
          aguardando
        </p>
        <p className="text-sm text-amber-700">Clique para ver e confirmar</p>
      </div>
    </Link>
  );
}
