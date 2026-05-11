"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  restaurantId: string;
}

export function NewFinanceEntryForm({ restaurantId }: Props) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<"REVENUE" | "EXPENSE">("REVENUE");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "PIX" | "CREDIT_CARD" | "DEBIT_CARD">("PIX");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/finance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          category,
          amount: Number(amount),
          date,
          type,
          paymentMethod,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error ?? "Erro ao salvar lançamento.");
        return;
      }

      router.push(`/dashboard/${restaurantId}/finance`);
      router.refresh();
    } catch {
      setError("Erro inesperado ao salvar lançamento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="type" className="text-sm font-medium text-neutral-700">Tipo</label>
          <select
            id="type"
            className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as "REVENUE" | "EXPENSE")}
          >
            <option value="REVENUE">Receita</option>
            <option value="EXPENSE">Despesa</option>
          </select>
        </div>

        <Input
          id="date"
          type="date"
          label="Data"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <Input
          id="description"
          label="Descrição"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex.: Venda balcão / Conta de luz"
        />

        <Input
          id="category"
          label="Categoria"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Ex.: Vendas, Operacional"
        />

        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          label="Valor"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />

        <div className="space-y-1.5">
          <label htmlFor="paymentMethod" className="text-sm font-medium text-neutral-700">Forma de pagamento</label>
          <select
            id="paymentMethod"
            className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as "CASH" | "PIX" | "CREDIT_CARD" | "DEBIT_CARD")}
          >
            <option value="PIX">PIX</option>
            <option value="CASH">Dinheiro</option>
            <option value="CREDIT_CARD">Cartão de crédito</option>
            <option value="DEBIT_CARD">Cartão de débito</option>
          </select>
        </div>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.push(`/dashboard/${restaurantId}/finance`)}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>Salvar lançamento</Button>
      </div>
    </form>
  );
}
