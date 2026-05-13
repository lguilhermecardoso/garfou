"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import DeviceTokenCard from "./device-token-card";

interface DeviceToken {
  id: string;
  token: string;
  type: "WAITER" | "KITCHEN";
  isActive: boolean;
  createdBy: string;
  creator: {
    name: string;
  };
  sessions: Array<{
    id: string;
    isActive: boolean;
  }>;
}

interface DeviceTokensManagerProps {
  restaurantId: string;
}

export default function DeviceTokensManager({ restaurantId }: DeviceTokensManagerProps) {
  const [tokens, setTokens] = useState<DeviceToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingType, setCreatingType] = useState<"WAITER" | "KITCHEN" | null>(null);

  const fetchTokens = useCallback(async () => {
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/tokens`);
      const data = await response.json();

      if (data.success) {
        setTokens(data.data);
      }
    } catch (error) {
      console.error("Error fetching tokens:", error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTokens();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchTokens, 30000);
    return () => clearInterval(interval);
  }, [fetchTokens]);

  const handleCreateToken = async (type: "WAITER" | "KITCHEN") => {
    setCreatingType(type);
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      const data = await response.json();

      if (response.ok) {
        fetchTokens();
      } else {
        alert(data.error || "Erro ao criar token");
      }
    } catch (error) {
      console.error("Error creating token:", error);
      alert("Erro ao criar token");
    } finally {
      setCreatingType(null);
    }
  };

  const hasWaiterToken = tokens.some((t) => t.type === "WAITER");
  const hasKitchenToken = tokens.some((t) => t.type === "KITCHEN");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create Token Buttons */}
      <div className="flex gap-3">
        {!hasWaiterToken && (
          <Button
            onClick={() => handleCreateToken("WAITER")}
            disabled={creatingType === "WAITER"}
            variant="outline"
            className="flex-1"
          >
            {creatingType === "WAITER" ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Criar Token Garçom
              </>
            )}
          </Button>
        )}

        {!hasKitchenToken && (
          <Button
            onClick={() => handleCreateToken("KITCHEN")}
            disabled={creatingType === "KITCHEN"}
            variant="outline"
            className="flex-1"
          >
            {creatingType === "KITCHEN" ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Criar Token Cozinha
              </>
            )}
          </Button>
        )}
      </div>

      {/* Token Cards */}
      {tokens.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          <p className="mb-2">Nenhum token criado ainda</p>
          <p className="text-sm">
            Clique em &quot;Criar Token&quot; para gerar tokens de acesso para tablets e TVs
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tokens.map((token) => (
            <DeviceTokenCard
              key={token.id}
              restaurantId={restaurantId}
              tokenId={token.id}
              token={token.token}
              type={token.type}
              sessionsCount={token.sessions.filter((s) => s.isActive).length}
              creatorName={token.creator.name}
              onTokenUpdated={fetchTokens}
            />
          ))}
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button onClick={fetchTokens} variant="ghost" size="sm" className="text-xs text-gray-500">
          <RefreshCw className="mr-1 h-3 w-3" />
          Atualizar
        </Button>
      </div>
    </div>
  );
}
