"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Smartphone, Tv } from "lucide-react";

interface DevicePinModalProps {
  restaurantId: string;
}

interface PinData {
  pin: string;
  type: "WAITER" | "KITCHEN";
  expiresInHours: number;
}

/**
 * DevicePinModal - Componente para gerar PIN e abrir apps em dispositivos
 *
 * Permite ao gerente:
 * 1. Clicar em "Abrir App Garçom" ou "Abrir App Cozinha"
 * 2. Sistema gera PIN de 6 dígitos
 * 3. Abre nova aba/janela para o dispositivo
 * 4. Mostra PIN em modal grande para digitar no tablet/TV
 *
 * UX: PIN grande e legível, fácil de ler de longe
 */
export default function DevicePinModal({ restaurantId }: DevicePinModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pinData, setPinData] = useState<PinData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generatePin = async (type: "WAITER" | "KITCHEN") => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/devices/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao gerar PIN");
      }

      setPinData(data.data);
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar PIN");
    } finally {
      setLoading(false);
    }
  };

  const copyPin = () => {
    if (pinData) {
      navigator.clipboard.writeText(pinData.pin);
    }
  };

  return (
    <>
      <div className="flex gap-3">
        <Button
          onClick={() => generatePin("WAITER")}
          disabled={loading}
          size="lg"
          className="flex items-center gap-2"
        >
          <Smartphone className="h-5 w-5" />
          {loading ? "Gerando..." : "Abrir App Garçom"}
        </Button>

        <Button
          onClick={() => generatePin("KITCHEN")}
          disabled={loading}
          variant="outline"
          size="lg"
          className="flex items-center gap-2"
        >
          <Tv className="h-5 w-5" />
          {loading ? "Gerando..." : "Abrir App Cozinha"}
        </Button>
      </div>

      {error && (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pinData?.type === "WAITER" ? "📱 App Garçom" : "👨‍🍳 App Cozinha"}
            </DialogTitle>
            <DialogDescription>
              Use este PIN para ativar o dispositivo na TV/Tablet
            </DialogDescription>
          </DialogHeader>

          {pinData && (
            <div className="space-y-4">
              {/* PIN em destaque */}
              <div className="rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 p-8 text-center">
                <p className="mb-2 text-sm text-gray-600">PIN de Ativação</p>
                <p className="font-mono text-6xl font-bold tracking-wider text-gray-900">
                  {pinData.pin.match(/.{1,3}/g)?.join(" ")}
                </p>
              </div>

              {/* URL para acessar */}
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="mb-1 text-xs text-gray-500">Acesse na TV/Tablet:</p>
                <p className="font-mono text-sm break-all text-gray-900">
                  {pinData.type === "WAITER"
                    ? `${window.location.origin}/waiter-app/activate`
                    : `${window.location.origin}/kitchen-app/activate`}
                </p>
              </div>

              {/* Botão copiar */}
              <Button onClick={copyPin} variant="outline" className="w-full">
                📋 Copiar PIN
              </Button>

              {/* Informações */}
              <div className="space-y-2 text-sm text-gray-600">
                <p className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  PIN válido por {pinData.expiresInHours} horas
                </p>
                <p className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                  Pode ser usado apenas uma vez
                </p>
                <p className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                  Sessão ativa por 24h após ativação
                </p>
              </div>

              {/* Instruções */}
              <div className="space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
                <p className="font-semibold text-gray-900">Instruções:</p>
                <ol className="list-inside list-decimal space-y-1 text-gray-600">
                  <li>Abra o navegador na TV/Tablet</li>
                  <li>Acesse a URL mostrada acima</li>
                  <li>Digite o PIN de 6 dígitos</li>
                  <li>Dispositivo ficará conectado por 24 horas</li>
                  <li>Use F11 para fullscreen</li>
                </ol>
              </div>

              <Button onClick={() => setOpen(false)} className="w-full">
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
