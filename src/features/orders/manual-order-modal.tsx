"use client";

/**
 * ManualOrderModal — Modal para lançamento retroativo de pedidos.
 *
 * Permite registrar pedidos que ocorreram antes do sistema ser utilizado
 * (ex: vendas do fim de semana de abertura). Cria o pedido com status
 * FINALIZADO e, opcionalmente, um lançamento financeiro vinculado.
 */

import { useState } from "react";
import { X, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneInput, CurrencyInput, parseCurrencyToNumber } from "@/components/ui/masked-input";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Props {
  restaurantId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TYPE_LABELS = {
  TAKEOUT: "Balcão / Retirada",
  DINE_IN: "Mesa",
  DELIVERY: "Delivery",
} as const;

const PAYMENT_LABELS = {
  PIX: "PIX",
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartão de Crédito",
  DEBIT_CARD: "Cartão de Débito",
  VOUCHER: "Voucher",
} as const;

function toLocalDatetimeValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ManualOrderModal({ restaurantId, open, onClose, onSuccess }: Props) {
  const now = new Date();
  const [date, setDate] = useState(toLocalDatetimeValue(now));
  const [type, setType] = useState<"TAKEOUT" | "DINE_IN" | "DELIVERY">("TAKEOUT");
  const [total, setTotal] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<keyof typeof PAYMENT_LABELS>("PIX");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [createFinanceEntry, setCreateFinanceEntry] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const totalNum = parseCurrencyToNumber(total);
    if (!totalNum || totalNum <= 0) {
      toast.error("Informe um valor válido para o pedido.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/orders/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          total: totalNum,
          type,
          paymentMethod,
          notes: notes || undefined,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          createFinanceEntry,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao lançar pedido.");
        return;
      }
      toast.success(`Pedido #${json.orderNumber} lançado com sucesso!`);
      // Reset form
      setDate(toLocalDatetimeValue(new Date()));
      setType("TAKEOUT");
      setTotal("");
      setPaymentMethod("PIX");
      setCustomerName("");
      setCustomerPhone("");
      setNotes("");
      setCreateFinanceEntry(true);
      onSuccess();
    } catch {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary-100 flex h-9 w-9 items-center justify-center rounded-xl">
              <ClipboardList className="text-primary-600 h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Lançar pedido retroativo</h2>
              <p className="text-xs text-neutral-500">
                Para pedidos recebidos antes de usar o sistema
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Date + Type row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="mo-date" className="text-sm font-medium text-neutral-700">
                Data e hora <span className="text-red-500">*</span>
              </label>
              <input
                id="mo-date"
                type="datetime-local"
                required
                max={toLocalDatetimeValue(new Date())}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="focus:ring-primary-500 h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm focus:border-transparent focus:ring-2 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="mo-type" className="text-sm font-medium text-neutral-700">
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                id="mo-type"
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
                className="focus:ring-primary-500 h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm focus:border-transparent focus:ring-2 focus:outline-none"
              >
                {Object.entries(TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Total + Payment row */}
          <div className="grid grid-cols-2 gap-3">
            <CurrencyInput
              id="mo-total"
              label="Valor total (R$)"
              required
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
            <div className="space-y-1.5">
              <label htmlFor="mo-payment" className="text-sm font-medium text-neutral-700">
                Pagamento
              </label>
              <select
                id="mo-payment"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                className="focus:ring-primary-500 h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm focus:border-transparent focus:ring-2 focus:outline-none"
              >
                {Object.entries(PAYMENT_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer row */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="mo-customer-name"
              label="Nome do cliente"
              placeholder="Opcional"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <PhoneInput
              id="mo-customer-phone"
              label="Telefone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label htmlFor="mo-notes" className="text-sm font-medium text-neutral-700">
              Observações
            </label>
            <textarea
              id="mo-notes"
              rows={2}
              placeholder="Ex: 2 hot dogs + bebida, pago em dinheiro..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="focus:ring-primary-500 w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:outline-none"
            />
          </div>

          {/* Finance entry checkbox */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 transition-colors hover:bg-neutral-100">
            <input
              type="checkbox"
              checked={createFinanceEntry}
              onChange={(e) => setCreateFinanceEntry(e.target.checked)}
              className="accent-primary-500 mt-0.5 h-4 w-4"
            />
            <div>
              <span className="text-sm font-medium text-neutral-800">Registrar no financeiro</span>
              <p className="text-xs text-neutral-500">
                Cria automaticamente um lançamento de receita na mesma data
              </p>
            </div>
          </label>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Lançando..." : "Lançar pedido"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
