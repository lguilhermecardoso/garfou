/**
 * useNotificationSound
 *
 * Toca /notification.wav em loop contínuo até ser explicitamente parado.
 * Uso:
 *   const { play, stop } = useNotificationSound();
 *   play();  // inicia loop
 *   stop();  // para imediatamente
 */

"use client";

import { useRef, useCallback, useEffect } from "react";

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio("/notification.wav");
    audio.loop = true;
    audio.volume = 1.0;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.paused) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  return { play, stop };
}
