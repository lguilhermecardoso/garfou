"use client";

import { useEffect, useRef, useState } from "react";

interface Notification {
  id: string;
  type: "NEW_ORDER" | "ORDER_READY" | "ORDER_CONFIRMED";
  message: string;
  createdAt: Date;
  read: boolean;
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Tom de sino agradável
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // Web Audio API não disponível
  }
}

export function useNotifications(restaurantId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevOrderCount = useRef(0);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const checkNewOrders = async () => {
      try {
        const res = await fetch(
          `/api/restaurants/${restaurantId}/orders?status=NOVO_PEDIDO,AGUARDANDO_CONFIRMACAO&pageSize=5`
        );

        if (!res.ok) return;

        const data = await res.json();
        const currentCount: number = data.total ?? 0;

        // Detecta novos pedidos
        if (!isFirstLoad.current && currentCount > prevOrderCount.current) {
          const newOrdersCount = currentCount - prevOrderCount.current;

          // Toca som de notificação
          playNotificationSound();

          // Adiciona notificação
          const newNotification: Notification = {
            id: `order-${Date.now()}`,
            type: "NEW_ORDER",
            message: `${newOrdersCount} novo${newOrdersCount > 1 ? "s" : ""} pedido${newOrdersCount > 1 ? "s" : ""} recebido${newOrdersCount > 1 ? "s" : ""}`,
            createdAt: new Date(),
            read: false,
          };

          setNotifications((prev) => [newNotification, ...prev].slice(0, 10)); // Mantém apenas últimas 10
          setUnreadCount((prev) => prev + 1);
        }

        isFirstLoad.current = false;
        prevOrderCount.current = currentCount;
      } catch (error) {
        console.error("[useNotifications] Error fetching orders:", error);
      }
    };

    // Checa imediatamente
    checkNewOrders();

    // Polling a cada 5 segundos
    const interval = setInterval(checkNewOrders, 5000);

    return () => clearInterval(interval);
  }, [restaurantId]);

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
}
