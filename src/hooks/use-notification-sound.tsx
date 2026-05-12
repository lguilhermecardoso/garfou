/**
 * useNotificationSound
 *
 * Hook para gerenciar som de notificação contínuo (loop) para novos pedidos.
 *
 * - Som alto (gain 0.95) tipo "plim plim" de campainha de hotel
 * - Toca em loop contínuo até ser explicitamente parado
 * - Usa Web Audio API para garantir controle fino sobre o som
 *
 * Uso:
 *   const { play, stop } = useNotificationSound();
 *   play();  // Inicia loop de som
 *   stop();  // Para o som imediatamente
 */

"use client";

import { useRef, useCallback, useEffect } from "react";

export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Para o loop de som imediatamente
   */
  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      if (audioContextRef.current?.state !== "closed") {
        audioContextRef.current?.close();
      }
    };
  }, []);

  /**
   * Toca um único "plim plim" de campainha de hotel - som alto e nítido
   */
  const playBell = useCallback(() => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new AudioContext();
      }

      const ctx = audioContextRef.current;
      const now = ctx.currentTime;

      // Primeiro "plim" (mais agudo)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.setValueAtTime(1200, now);
      gain1.gain.setValueAtTime(0.95, now); // MUITO ALTO
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Segundo "plim" (mesma frequência, logo após)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.setValueAtTime(1200, now + 0.15);
      gain2.gain.setValueAtTime(0.95, now + 0.15); // MUITO ALTO
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.3);
    } catch (error) {
      // Web Audio API não disponível - falha silenciosa
      console.warn("Web Audio API not available:", error);
    }
  }, []);

  /**
   * Inicia o loop de som - toca a cada 2 segundos até ser explicitamente parado
   */
  const play = useCallback(() => {
    // Se já está tocando, não inicia novamente
    if (intervalRef.current) return;

    // Toca imediatamente
    playBell();

    // Configura loop a cada 2 segundos
    intervalRef.current = setInterval(() => {
      playBell();
    }, 2000);
  }, [playBell]);

  return { play, stop };
}
