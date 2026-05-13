"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import KitchenScreen from "@/features/kitchen/kitchen-screen";
import { Button } from "@/components/ui/button";

/**
 * KitchenAppFullscreen - App da Cozinha em modo fullscreen para TVs/tablets
 *
 * Diferenças do app normal:
 * - Sem sidebar/header do dashboard
 * - Autenticação via BFF (bearer tokens, sem cookies)
 * - Botão de desconectar discreto no canto
 * - Ideal para deixar em fullscreen F11 em TV da cozinha
 *
 * Segurança: Valida bearer token a cada 30s, desloga se inválido
 */
export default function KitchenAppFullscreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [bearerToken, setBearerToken] = useState<string | null>(null);

  const validateSession = useCallback(async () => {
    const token = localStorage.getItem("device_bearer_token");
    const type = localStorage.getItem("deviceType");

    if (!token) {
      router.push("/kitchen-app/activate");
      return;
    }

    // Verifica se tipo está correto
    if (type !== "KITCHEN") {
      setError("Este dispositivo não está configurado como App Cozinha");
      setLoading(false);
      return;
    }

    try {
      // Validar bearer token fazendo uma requisição simples ao BFF
      const response = await fetch(`/api/bff/orders?pageSize=1`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        // Token inválido ou expirado
        localStorage.clear();
        router.push("/kitchen-app/activate");
        return;
      }

      if (!response.ok) {
        throw new Error("Erro ao validar sessão");
      }

      const data = await response.json();

      if (data.success && data.device) {
        setRestaurantId(data.device.restaurant.id);
        setRestaurantName(data.device.restaurant.name);
        setBearerToken(token);
        setLoading(false);
      } else {
        throw new Error("Resposta inválida do servidor");
      }
    } catch {
      setError("Erro ao validar sessão. Tente reconectar.");
      setLoading(false);
    }
  }, [router]);

  // Valida sessão ao carregar
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    validateSession();

    // Revalida a cada 30 segundos
    const interval = setInterval(validateSession, 30000);
    return () => clearInterval(interval);
  }, [validateSession]);

  const handleDisconnect = async () => {
    localStorage.clear();
    router.push("/kitchen-app/activate");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-orange-500"></div>
          <p className="text-gray-300">Validando dispositivo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-900">
            <svg
              className="h-10 w-10 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-white">Erro de Conexão</h2>
          <p className="mb-6 text-gray-400">{error}</p>
          <Button onClick={() => router.push("/kitchen-app/activate")}>
            Reconectar Dispositivo
          </Button>
        </div>
      </div>
    );
  }

  if (!restaurantId || !bearerToken) return null;

  return (
    <div className="relative min-h-screen bg-gray-900">
      {/* Header discreto com botão desconectar (canto superior direito) */}
      <div className="absolute top-2 right-2 z-50 flex items-center gap-2 rounded-lg bg-gray-800/80 px-3 py-2 backdrop-blur">
        <span className="text-xs text-gray-400">{restaurantName}</span>
        <Button
          variant="ghost"
          onClick={handleDisconnect}
          size="sm"
          className="text-xs text-gray-400 hover:text-white"
        >
          Desconectar
        </Button>
      </div>

      {/* App da Cozinha (fullscreen) */}
      <KitchenScreen restaurantId={restaurantId} bearerToken={bearerToken} />
    </div>
  );
}
