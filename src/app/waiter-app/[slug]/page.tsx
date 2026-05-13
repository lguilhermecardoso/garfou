"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import WaiterApp from "@/features/waiter/waiter-app";
import { Button } from "@/components/ui/button";

/**
 * WaiterAppFullscreen - App do Garçom em modo fullscreen para tablets
 *
 * Diferenças do app normal:
 * - Sem sidebar/header do dashboard
 * - Autenticação via BFF (bearer tokens, sem cookies)
 * - Botão de desconectar no canto superior
 * - Ideal para deixar em fullscreen F11 em tablet
 *
 * Segurança: Valida bearer token a cada 30s, desloga se inválido
 */
export default function WaiterAppFullscreen() {
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
      router.push("/waiter-app/activate");
      return;
    }

    // Verifica se tipo está correto
    if (type !== "WAITER") {
      setError("Este dispositivo não está configurado como App Garçom");
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
        router.push("/waiter-app/activate");
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
    router.push("/waiter-app/activate");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Validando dispositivo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-10 w-10 text-red-600"
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
          <h2 className="mb-2 text-xl font-bold text-gray-900">Erro de Conexão</h2>
          <p className="mb-6 text-gray-600">{error}</p>
          <Button onClick={() => router.push("/waiter-app/activate")}>
            Reconectar Dispositivo
          </Button>
        </div>
      </div>
    );
  }

  if (!restaurantId || !bearerToken) return null;

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* Header fixo com info do restaurante + botão desconectar */}
      <div className="sticky top-0 z-10 border-b bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">App Garçom</h1>
              <p className="text-sm text-gray-500">{restaurantName}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleDisconnect} size="sm">
            Desconectar
          </Button>
        </div>
      </div>

      {/* App do Garçom */}
      <div className="p-4">
        <WaiterApp restaurantId={restaurantId} bearerToken={bearerToken} />
      </div>
    </div>
  );
}
