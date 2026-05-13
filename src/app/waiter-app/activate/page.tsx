"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

/**
 * WaiterAppActivate - Tela de ativação por TOKEN para App Garçom (BFF)
 *
 * Fluxo:
 * 1. Gerente visualiza TOKEN no dashboard (6 dígitos, permanente)
 * 2. Abre esta tela em tablet
 * 3. Garçom digita TOKEN
 * 4. Sistema valida via BFF e retorna bearerToken
 * 5. Armazena bearerToken no localStorage
 * 6. Redireciona para /waiter-app (fullscreen)
 *
 * Segurança: Token é permanente, pode ser usado por múltiplos dispositivos, vinculado ao restaurante
 * BFF: Independente de cookies/NextAuth, funciona em abas anônimas
 */
export default function WaiterAppActivate() {
  const router = useRouter();
  const [token, setToken] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus no primeiro input ao carregar
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Handler para mudança de input
  const handleChange = (index: number, value: string) => {
    // Aceita apenas números
    if (value && !/^\d$/.test(value)) return;

    const newToken = [...token];
    newToken[index] = value;
    setToken(newToken);
    setError(null);

    // Move para próximo input automaticamente
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handler para backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !token[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handler para colar TOKEN completo
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);

    if (pastedData.length === 6) {
      const newToken = pastedData.split("");
      setToken(newToken);
      inputRefs.current[5]?.focus();
    }
  };

  const validateToken = useCallback(
    async (fullToken: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/bff/devices/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: fullToken }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Token inválido");
        }

        // Armazena bearer token no localStorage
        localStorage.setItem("device_bearer_token", data.data.bearerToken);
        localStorage.setItem("deviceType", data.data.deviceType);
        localStorage.setItem("restaurantId", data.data.restaurant.id);
        localStorage.setItem("restaurantName", data.data.restaurant.name);

        // Redireciona para app principal
        router.push(`/waiter-app/${data.data.restaurant.slug}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao validar token");
        setToken(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        setLoading(false);
      }
    },
    [router]
  );

  // Valida TOKEN quando todos os 6 dígitos estão preenchidos
  useEffect(() => {
    const fullToken = token.join("");
    if (fullToken.length === 6) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      validateToken(fullToken);
    }
  }, [token, validateToken]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-600">
            <svg
              className="h-10 w-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">App Garçom</h1>
          <p className="text-gray-600">Digite o token para ativar este dispositivo</p>
        </div>

        <div className="mb-6 flex justify-center gap-3" onPaste={handlePaste}>
          {token.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="h-14 w-14 text-center text-2xl font-bold"
              disabled={loading}
            />
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="mb-4 text-center text-gray-600">
            <div className="mb-2 inline-block h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p>Validando token...</p>
          </div>
        )}

        <div className="space-y-1 text-center text-sm text-gray-500">
          <p>✓ Token permanente (não expira)</p>
          <p>✓ Pode ser usado em múltiplos tablets</p>
          <p>✓ Consulte o token no dashboard</p>
        </div>
      </Card>
    </div>
  );
}
