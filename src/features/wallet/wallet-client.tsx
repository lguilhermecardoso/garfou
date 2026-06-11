/**
 * WalletClient
 *
 * Displays online payment revenue for the restaurant: gross sales,
 * estimated Stripe fees, and net received amount, with a transaction list.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { QrCode, CreditCard, TrendingUp, TrendingDown, Wallet, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Transaction {
  id: string;
  orderNumber: number;
  createdAt: string;
  gross: number;
  fee: number;
  net: number;
  discount: number;
  paymentMethod: string;
  type: string;
  customer: { id: string; name: string; phone: string | null } | null;
}

interface WalletData {
  grossTotal: number;
  totalFees: number;
  netTotal: number;
  transactionCount: number;
  transactions: Transaction[];
}

interface Props {
  restaurantId: string;
}

const ORDER_TYPE_LABEL: Record<string, string> = {
  DELIVERY: "Delivery",
  TAKEOUT: "Retirada",
  DINE_IN: "Mesa",
};

export function WalletClient({ restaurantId }: Props) {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery<WalletData>({
    queryKey: ["wallet", restaurantId, from, to],
    queryFn: async () => {
      const res = await fetch(
        `/api/restaurants/${restaurantId}/wallet?from=${from}&to=${to + "T23:59:59"}`
      );
      const json = await res.json();
      return json.data;
    },
  });

  const stats = [
    {
      label: "Vendas brutas",
      value: data?.grossTotal ?? 0,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Taxas Stripe (estimado)",
      value: data?.totalFees ?? 0,
      icon: TrendingDown,
      color: "text-red-500",
      bg: "bg-red-50",
    },
    {
      label: "Recebido líquido",
      value: data?.netTotal ?? 0,
      icon: Wallet,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Carteira Online</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Receita de pagamentos confirmados via Stripe (PIX e cartão)
        </p>
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-neutral-400" aria-hidden="true" />
          <span className="text-sm font-medium text-neutral-700">Período:</span>
        </div>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
        />
        <span className="text-sm text-neutral-400">até</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
        />
        <span className="text-xs text-neutral-400">
          {data?.transactionCount ?? 0}{" "}
          {(data?.transactionCount ?? 0) === 1 ? "transação" : "transações"}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-500">{stat.label}</span>
              <div className={`rounded-lg p-2 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} aria-hidden="true" />
              </div>
            </div>
            {isLoading ? (
              <div className="mt-2 h-8 w-32 animate-pulse rounded bg-neutral-100" />
            ) : (
              <p className={`mt-2 text-2xl font-bold ${stat.color}`}>
                {formatCurrency(stat.value)}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Fee note */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
        <strong>Estimativa de taxas:</strong> PIX 0,99% · Cartão 3,49% + R$ 0,39/transação. Os
        valores reais podem variar conforme seu contrato com o Stripe. Consulte o painel do Stripe
        para valores exatos.
      </div>

      {/* Transaction table */}
      <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-4">
          <h2 className="font-semibold text-neutral-900">Transações</h2>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        ) : !data?.transactions.length ? (
          <div className="py-16 text-center">
            <Wallet className="mx-auto mb-3 h-10 w-10 text-neutral-300" aria-hidden="true" />
            <p className="text-sm font-medium text-neutral-500">Nenhuma transação no período</p>
            <p className="mt-1 text-xs text-neutral-400">
              Transações aparecem após o cliente confirmar o pagamento online
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-semibold text-neutral-500">
                  <th className="px-5 py-3">#</th>
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Pagamento</th>
                  <th className="px-5 py-3 text-right">Bruto</th>
                  <th className="px-5 py-3 text-right">Taxa</th>
                  <th className="px-5 py-3 text-right">Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {data.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-neutral-50">
                    <td className="px-5 py-3 font-mono text-xs text-neutral-500">
                      #{tx.orderNumber}
                    </td>
                    <td className="px-5 py-3 text-neutral-600">
                      {new Date(tx.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-neutral-900">{tx.customer?.name ?? "—"}</p>
                      {tx.customer?.phone && (
                        <p className="text-xs text-neutral-400">{tx.customer.phone}</p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="outline" className="text-xs">
                        {ORDER_TYPE_LABEL[tx.type] ?? tx.type}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1.5 text-xs">
                        {tx.paymentMethod === "PIX" ? (
                          <QrCode className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                        ) : (
                          <CreditCard className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
                        )}
                        {tx.paymentMethod === "PIX" ? "PIX" : "Cartão"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-neutral-900">
                      {formatCurrency(tx.gross)}
                    </td>
                    <td className="px-5 py-3 text-right text-red-500">-{formatCurrency(tx.fee)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-emerald-600">
                      {formatCurrency(tx.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-neutral-200 bg-neutral-50 font-semibold">
                  <td colSpan={5} className="px-5 py-3 text-sm text-neutral-700">
                    Total ({data.transactionCount}{" "}
                    {data.transactionCount === 1 ? "transação" : "transações"})
                  </td>
                  <td className="px-5 py-3 text-right text-neutral-900">
                    {formatCurrency(data.grossTotal)}
                  </td>
                  <td className="px-5 py-3 text-right text-red-500">
                    -{formatCurrency(data.totalFees)}
                  </td>
                  <td className="px-5 py-3 text-right text-emerald-600">
                    {formatCurrency(data.netTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
