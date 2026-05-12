"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  restaurantId: string;
}

export function NewInventoryItemForm({ restaurantId }: Props) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("un");
  const [currentStock, setCurrentStock] = useState("0");
  const [minimumStock, setMinimumStock] = useState("0");
  const [averageCost, setAverageCost] = useState("0");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          unit,
          currentStock: Number(currentStock),
          minimumStock: Number(minimumStock),
          averageCost: Number(averageCost),
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        const errorMsg = payload?.error ?? "Erro ao salvar item.";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      toast.success("Item adicionado ao estoque!", {
        description: `${name} foi adicionado com sucesso`,
      });
      router.push(`/dashboard/${restaurantId}/inventory`);
      router.refresh();
    } catch {
      const errorMsg = "Erro inesperado ao salvar item.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          id="name"
          label="Nome do item"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Queijo muçarela"
        />
        <Input
          id="unit"
          label="Unidade"
          required
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Ex.: kg, un, L"
        />
        <Input
          id="currentStock"
          type="number"
          min="0"
          step="0.01"
          label="Estoque atual"
          required
          value={currentStock}
          onChange={(e) => setCurrentStock(e.target.value)}
        />
        <Input
          id="minimumStock"
          type="number"
          min="0"
          step="0.01"
          label="Estoque mínimo"
          required
          value={minimumStock}
          onChange={(e) => setMinimumStock(e.target.value)}
        />
        <Input
          id="averageCost"
          type="number"
          min="0"
          step="0.01"
          label="Custo médio"
          required
          value={averageCost}
          onChange={(e) => setAverageCost(e.target.value)}
        />
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(`/dashboard/${restaurantId}/inventory`)}
        >
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          Salvar item
        </Button>
      </div>
    </form>
  );
}
