"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Minus, Edit3 } from "lucide-react";

type OperationType = "IN" | "OUT" | "ADJUSTMENT";

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
}

interface Props {
  item: InventoryItem;
  restaurantId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const OPERATION_CONFIG = {
  IN: {
    title: "Adicionar ao Estoque",
    icon: Plus,
    color: "emerald",
    label: "Quantidade a adicionar",
    placeholder: "Ex.: 10",
  },
  OUT: {
    title: "Remover do Estoque",
    icon: Minus,
    color: "red",
    label: "Quantidade a remover",
    placeholder: "Ex.: 5",
  },
  ADJUSTMENT: {
    title: "Ajustar Estoque",
    icon: Edit3,
    color: "blue",
    label: "Nova quantidade",
    placeholder: "Ex.: 15",
  },
} as const;

export function StockOperationsModal({ item, restaurantId, onClose, onSuccess }: Props) {
  const [operationType, setOperationType] = useState<OperationType>("IN");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const config = OPERATION_CONFIG[operationType];
  const Icon = config.icon;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      toast.error("Quantidade inválida");
      return;
    }

    setLoading(true);

    try {
      let finalQuantity = qty;
      let finalType = operationType;

      // For ADJUSTMENT, calculate the delta
      if (operationType === "ADJUSTMENT") {
        const delta = qty - item.currentStock;
        finalQuantity = Math.abs(delta);
        finalType = delta >= 0 ? "IN" : "OUT";

        if (delta === 0) {
          toast.info("Nenhuma alteração necessária");
          onClose();
          return;
        }
      }

      const res = await fetch(`/api/restaurants/${restaurantId}/inventory/${item.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: finalType,
          quantity: finalQuantity,
          reason: reason || undefined,
        }),
      });

      const payload = await res.json();

      if (!res.ok) {
        const errorMsg = payload?.error ?? "Erro ao movimentar estoque";
        toast.error(errorMsg);
        return;
      }

      const messages = {
        IN: `${qty} ${item.unit} adicionado(s) ao estoque`,
        OUT: `${qty} ${item.unit} removido(s) do estoque`,
        ADJUSTMENT: `Estoque ajustado para ${qty} ${item.unit}`,
      };

      toast.success("Estoque atualizado!", {
        description: messages[operationType],
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Stock operation error:", error);
      toast.error("Erro inesperado ao movimentar estoque");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 p-6">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Movimentar Estoque</h2>
            <p className="mt-0.5 text-sm text-neutral-500">
              {item.name} - {item.currentStock} {item.unit} disponível
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:bg-neutral-100"
            aria-label="Fechar"
          >
            <X className="h-5 w-5 text-neutral-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Operation Type Selector */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setOperationType("IN");
                setQuantity("");
              }}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                operationType === "IN"
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <Plus
                className={`h-5 w-5 ${operationType === "IN" ? "text-emerald-600" : "text-neutral-400"}`}
              />
              <span
                className={`text-xs font-semibold ${operationType === "IN" ? "text-emerald-700" : "text-neutral-600"}`}
              >
                Entrada
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOperationType("OUT");
                setQuantity("");
              }}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                operationType === "OUT"
                  ? "border-red-500 bg-red-50"
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <Minus
                className={`h-5 w-5 ${operationType === "OUT" ? "text-red-600" : "text-neutral-400"}`}
              />
              <span
                className={`text-xs font-semibold ${operationType === "OUT" ? "text-red-700" : "text-neutral-600"}`}
              >
                Saída
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOperationType("ADJUSTMENT");
                setQuantity("");
              }}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                operationType === "ADJUSTMENT"
                  ? "border-blue-500 bg-blue-50"
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <Edit3
                className={`h-5 w-5 ${operationType === "ADJUSTMENT" ? "text-blue-600" : "text-neutral-400"}`}
              />
              <span
                className={`text-xs font-semibold ${operationType === "ADJUSTMENT" ? "text-blue-700" : "text-neutral-600"}`}
              >
                Ajuste
              </span>
            </button>
          </div>

          {/* Quantity Input */}
          <Input
            id="quantity"
            type="number"
            min="0"
            step="0.001"
            label={config.label}
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={config.placeholder}
            autoFocus
          />

          {/* Reason Input */}
          <div>
            <label htmlFor="reason" className="mb-1 block text-sm font-medium text-neutral-700">
              Motivo <span className="text-neutral-400">(opcional)</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: Compra, Venda, Correção de inventário..."
              rows={2}
              className="focus:ring-primary-500 w-full resize-none rounded-xl border border-neutral-200 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:outline-none"
            />
          </div>

          {/* Preview */}
          {quantity && Number(quantity) > 0 && (
            <div
              className={`rounded-xl border-2 p-3 ${
                operationType === "IN"
                  ? "border-emerald-200 bg-emerald-50"
                  : operationType === "OUT"
                    ? "border-red-200 bg-red-50"
                    : "border-blue-200 bg-blue-50"
              }`}
            >
              <p className="text-sm font-medium text-neutral-700">
                {operationType === "IN" && (
                  <>
                    Novo estoque:{" "}
                    <span className="font-bold text-emerald-700">
                      {item.currentStock + Number(quantity)} {item.unit}
                    </span>
                  </>
                )}
                {operationType === "OUT" && (
                  <>
                    Novo estoque:{" "}
                    <span className="font-bold text-red-700">
                      {Math.max(0, item.currentStock - Number(quantity))} {item.unit}
                    </span>
                  </>
                )}
                {operationType === "ADJUSTMENT" && (
                  <>
                    Novo estoque:{" "}
                    <span className="font-bold text-blue-700">
                      {Number(quantity)} {item.unit}
                    </span>
                  </>
                )}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              <Icon className="mr-2 h-4 w-4" />
              Confirmar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
