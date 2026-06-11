/**
 * AdminDashboard
 *
 * Platform admin panel — only accessible to users with isAdmin=true.
 * Shows collected platform fees (R$1 per online order), pending fees,
 * and a full transaction list filterable by date range.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Wallet, TrendingUp, Clock, Store, QrCode, CreditCard, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface FeeEntry {
  id: string;
  restaurantName: string;
  restaurantSlug: string;
  orderNumber: number;
  orderTotal: number;
  amount: number;
  paymentMethod: string;
  collectedAt: string;
  createdAt: string;
}

interface AdminStats {
  collectedTotal: number;
  collectedCount: number;
  pendingCount: number;
  restaurantsCount: number;
  recentFees: FeeEntry[];
}

export function AdminDashboard() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery<AdminStats>({
    queryKey: ["admin-stats", from, to],
    queryFn: async () => {
      const res = await fetch(`/api/admin/stats?from=${from}&to=${to + "T23:59:59"}`);
      if (!res.ok) throw new Error("Forbidden");
      const json = await res.json();
      return json.data;
    },
  });

  const stats = [
    {
      label: "Taxas coletadas",
      value: formatCurrency(data?.collectedTotal ?? 0),
      sub: `${data?.collectedCount ?? 0} transações`,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Aguardando pagamento",
      value: String(data?.pendingCount ?? 0),
      sub: "pedidos sem confirmação",
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Restaurantes ativos",
      value: String(data?.restaurantsCount ?? 0),
      sub: "na plataforma",
      icon: Store,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-red-100 p-2">
          <Wallet className="h-6 w-6 text-red-600" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Painel Admin</h1>
          <p className="text-sm text-neutral-500">
            Taxas de serviço online da plataforma chamou.delivery
          </p>
        </div>
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
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none"
        />
        <span className="text-sm text-neutral-400">até</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none"
        />
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
              <>
                <p className={`mt-2 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="mt-0.5 text-xs text-neutral-400">{stat.sub}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Transactions */}
      <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-4">
          <h2 className="font-semibold text-neutral-900">Taxas coletadas no período</h2>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        ) : !data?.recentFees.length ? (
          <div className="py-16 text-center">
            <Wallet className="mx-auto mb-3 h-10 w-10 text-neutral-300" aria-hidden="true" />
            <p className="text-sm font-medium text-neutral-500">Nenhuma taxa coletada no período</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-semibold text-neutral-500">
                  <th className="px-5 py-3">Restaurante</th>
                  <th className="px-5 py-3">Pedido</th>
                  <th className="px-5 py-3">Pagamento</th>
                  <th className="px-5 py-3">Valor pedido</th>
                  <th className="px-5 py-3 text-right">Taxa coletada</th>
                  <th className="px-5 py-3">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {data.recentFees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-neutral-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-neutral-900">{fee.restaurantName}</p>
                      <p className="text-xs text-neutral-400">{fee.restaurantSlug}</p>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-neutral-500">
                      #{fee.orderNumber}
                    </td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1.5 text-xs">
                        {fee.paymentMethod === "PIX" ? (
                          <QrCode className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                        ) : (
                          <CreditCard className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
                        )}
                        {fee.paymentMethod === "PIX" ? "PIX" : "Cartão"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-neutral-700">{formatCurrency(fee.orderTotal)}</td>
                    <td className="px-5 py-3 text-right">
                      <Badge className="bg-emerald-100 text-emerald-700">
                        {formatCurrency(fee.amount)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-neutral-500">
                      {new Date(fee.collectedAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-neutral-200 bg-neutral-50 font-semibold">
                  <td colSpan={4} className="px-5 py-3 text-sm text-neutral-700">
                    Total ({data.collectedCount}{" "}
                    {data.collectedCount === 1 ? "transação" : "transações"})
                  </td>
                  <td className="px-5 py-3 text-right text-emerald-600">
                    {formatCurrency(data.collectedTotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
