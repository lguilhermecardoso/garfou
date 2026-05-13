"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, Tv, X } from "lucide-react";

interface DeviceSessionsListProps {
  restaurantId: string;
}

interface DeviceSession {
  id: string;
  type: "WAITER" | "KITCHEN";
  activatedAt: string | null;
  expiresAt: string;
  deviceInfo: string | null;
  creator: {
    name: string;
    email: string;
  };
}

/**
 * DeviceSessionsList - Lista sessões ativas de dispositivos
 *
 * Mostra todas as TVs/tablets conectados e permite revogar acesso.
 */
export default function DeviceSessionsList({ restaurantId }: DeviceSessionsListProps) {
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/devices/generate`);
      const data = await response.json();

      if (response.ok) {
        // Filtra apenas sessões ativadas
        setSessions(data.data.filter((s: DeviceSession) => s.activatedAt !== null));
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  const revokeSession = async (sessionId: string) => {
    setRevoking(sessionId);

    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/devices/revoke`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (response.ok) {
        // Remove da lista
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      }
    } catch (error) {
      console.error("Error revoking session:", error);
    } finally {
      setRevoking(null);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSessions();
    // Atualiza a cada 30 segundos
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
      fetchSessions();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  if (loading) {
    return <div className="text-sm text-gray-500">Carregando dispositivos...</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">Nenhum dispositivo conectado no momento</div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">
        Dispositivos Conectados ({sessions.length})
      </p>

      <div className="space-y-2">
        {sessions.map((session) => {
          const expiresAt = new Date(session.expiresAt);
          const hoursRemaining = Math.max(
            0,
            Math.ceil((expiresAt.getTime() - currentTime) / (1000 * 60 * 60))
          );

          return (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
            >
              <div className="flex items-center gap-3">
                {session.type === "WAITER" ? (
                  <Smartphone className="h-5 w-5 text-blue-600" />
                ) : (
                  <Tv className="h-5 w-5 text-orange-600" />
                )}

                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {session.type === "WAITER" ? "App Garçom" : "App Cozinha"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Expira em {hoursRemaining}h • Ativado por {session.creator.name}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => revokeSession(session.id)}
                disabled={revoking === session.id}
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                {revoking === session.id ? (
                  "Revogando..."
                ) : (
                  <>
                    <X className="mr-1 h-4 w-4" />
                    Desconectar
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
