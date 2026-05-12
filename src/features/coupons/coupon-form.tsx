"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
  restaurantId: string;
}

export function CouponForm({ restaurantId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const type = fd.get("type") as string;
    const expiresAt = fd.get("expiresAt") as string;
    const maxUses = fd.get("maxUses") as string;
    const minOrderValue = fd.get("minOrderValue") as string;

    const body = {
      code: (fd.get("code") as string).toUpperCase().replace(/\s/g, ""),
      type,
      value: parseFloat(fd.get("value") as string),
      minOrderValue: minOrderValue ? parseFloat(minOrderValue) : 0,
      maxUses: maxUses ? parseInt(maxUses) : undefined,
      isFirstOrderOnly: fd.get("isFirstOrderOnly") === "on",
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    };

    const res = await fetch(`/api/restaurants/${restaurantId}/coupons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      const errorMsg = data.error ?? "Erro ao criar cupom";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    toast.success("Cupom criado com sucesso!", {
      description: `Código: ${body.code}`,
    });
    router.push(`/dashboard/${restaurantId}/coupons`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="code">
          Código do cupom *
        </label>
        <input
          id="code"
          name="code"
          required
          minLength={3}
          maxLength={20}
          pattern="[A-Za-z0-9]+"
          placeholder="DESCONTO10"
          className="focus:ring-primary-400 w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm uppercase focus:ring-2 focus:outline-none"
        />
        <p className="mt-1 text-xs text-neutral-400">Apenas letras e números, sem espaços.</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="type">
          Tipo de desconto *
        </label>
        <select
          id="type"
          name="type"
          required
          className="focus:ring-primary-400 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
        >
          <option value="PERCENTAGE">Porcentagem (%)</option>
          <option value="FIXED_AMOUNT">Valor fixo (R$)</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="value">
          Valor do desconto *
        </label>
        <input
          id="value"
          name="value"
          type="number"
          required
          min={0.01}
          step={0.01}
          placeholder="10"
          className="focus:ring-primary-400 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
        />
        <p className="mt-1 text-xs text-neutral-400">
          Para porcentagem, informe o número (ex: 10 = 10%). Para valor fixo, em reais.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="minOrderValue">
          Pedido mínimo (R$)
        </label>
        <input
          id="minOrderValue"
          name="minOrderValue"
          type="number"
          min={0}
          step={0.01}
          placeholder="0"
          className="focus:ring-primary-400 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="maxUses">
          Limite de usos (deixe vazio = ilimitado)
        </label>
        <input
          id="maxUses"
          name="maxUses"
          type="number"
          min={1}
          step={1}
          placeholder="100"
          className="focus:ring-primary-400 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="expiresAt">
          Data de vencimento (opcional)
        </label>
        <input
          id="expiresAt"
          name="expiresAt"
          type="datetime-local"
          className="focus:ring-primary-400 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isFirstOrderOnly"
          name="isFirstOrderOnly"
          type="checkbox"
          className="text-primary-500 focus:ring-primary-400 h-4 w-4 rounded border-neutral-300"
        />
        <label htmlFor="isFirstOrderOnly" className="text-sm text-neutral-700">
          Válido apenas para primeiro pedido
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-primary-500 hover:bg-primary-600 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Criar cupom"}
        </button>
        <a
          href={`/dashboard/${restaurantId}/coupons`}
          className="rounded-xl border border-neutral-200 px-5 py-2 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-50"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
