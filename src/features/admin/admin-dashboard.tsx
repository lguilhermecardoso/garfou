/**
 * AdminDashboard
 *
 * Platform admin panel — only accessible to users with isAdmin=true.
 * Sections:
 *  1. Overview cards: paying clients, trialing, fees collected
 *  2. Stripe balance (available / pending)
 *  3. Payout requests (list + create new)
 *  4. Active restaurant list
 *  5. Fee transaction history (date-filtered)
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Wallet,
  TrendingUp,
  Clock,
  Store,
  QrCode,
  CreditCard,
  Calendar,
  Users,
  BadgeCheck,
  AlertTriangle,
  ArrowDownToLine,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Hourglass,
  Zap,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminStats {
  collectedTotal: number;
  collectedCount: number;
  pendingCount: number;
  totalRestaurants: number;
  activePaying: number;
  payingWithStripe: number;
  trialing: number;
  pastDue: number;
  canceled: number;
  estimatedMRR: number;
  activeRestaurants: {
    id: string;
    name: string;
    slug: string;
    status: string;
    hasStripeSubscription: boolean;
    trialEndsAt: string | null;
    createdAt: string;
  }[];
  recentFees: {
    id: string;
    restaurantName: string;
    restaurantSlug: string;
    orderNumber: number;
    orderTotal: number;
    amount: number;
    paymentMethod: string;
    collectedAt: string;
    createdAt: string;
  }[];
}

interface StripeBalance {
  available: number;
  pending: number;
  total: number;
  livemode: boolean;
}

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  arrivalDate: string;
  description: string | null;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativo",
  TRIALING: "Trial",
  PAST_DUE: "Inadimplente",
  CANCELED: "Cancelado",
  UNPAID: "Não pago",
};

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  TRIALING: "bg-blue-100 text-blue-700",
  PAST_DUE: "bg-red-100 text-red-700",
  CANCELED: "bg-neutral-100 text-neutral-500",
  UNPAID: "bg-amber-100 text-amber-700",
};

const PAYOUT_STATUS_ICON: Record<string, React.ReactNode> = {
  paid: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  pending: <Hourglass className="h-4 w-4 text-amber-500" />,
  in_transit: <Zap className="h-4 w-4 text-blue-500" />,
  canceled: <XCircle className="h-4 w-4 text-neutral-400" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
};

const PAYOUT_STATUS_LABEL: Record<string, string> = {
  paid: "Pago",
  pending: "Pendente",
  in_transit: "Em trânsito",
  canceled: "Cancelado",
  failed: "Falhou",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminDashboard() {
  const queryClient = useQueryClient();

  // Date filter for fees
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  // Payout form
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutDescription, setPayoutDescription] = useState("");
  const [showPayoutForm, setShowPayoutForm] = useState(false);

  // ── Queries ──
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["admin-stats", from, to],
    queryFn: async () => {
      const res = await fetch(`/api/admin/stats?from=${from}&to=${to + "T23:59:59"}`);
      if (!res.ok) throw new Error("Forbidden");
      return (await res.json()).data;
    },
  });

  const {
    data: balance,
    isLoading: balanceLoading,
    refetch: refetchBalance,
  } = useQuery<StripeBalance>({
    queryKey: ["admin-stripe-balance"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stripe-balance");
      if (!res.ok) throw new Error("Stripe error");
      return (await res.json()).data;
    },
    staleTime: 60_000,
  });

  const { data: payoutsData, isLoading: payoutsLoading } = useQuery<Payout[]>({
    queryKey: ["admin-payouts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/payouts");
      if (!res.ok) throw new Error("Stripe error");
      return (await res.json()).data;
    },
    staleTime: 60_000,
  });

  // ── Create payout mutation ──
  const createPayout = useMutation({
    mutationFn: async () => {
      const amountCents = Math.round(parseFloat(payoutAmount) * 100);
      if (isNaN(amountCents) || amountCents < 100) throw new Error("Valor mínimo é R$ 1,00");
      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents, description: payoutDescription || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao solicitar saque");
      return json.data;
    },
    onSuccess: () => {
      toast.success("Saque solicitado com sucesso!");
      setShowPayoutForm(false);
      setPayoutAmount("");
      setPayoutDescription("");
      queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stripe-balance"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Stat cards ──
  const overviewCards = [
    {
      label: "Clientes pagantes",
      value: stats?.activePaying ?? 0,
      icon: BadgeCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Em trial",
      value: stats?.trialing ?? 0,
      icon: Clock,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Inadimplentes",
      value: stats?.pastDue ?? 0,
      icon: AlertTriangle,
      color: "text-red-500",
      bg: "bg-red-50",
    },
    {
      label: "Total na plataforma",
      value: stats?.totalRestaurants ?? 0,
      icon: Store,
      color: "text-neutral-600",
      bg: "bg-neutral-100",
    },
    {
      label: "MRR estimado",
      value: formatCurrency(stats?.estimatedMRR ?? 0),
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      sub: `Starter × ${stats?.payingWithStripe ?? 0} c/ Stripe ativo`,
    },
    {
      label: "Taxas coletadas",
      value: formatCurrency(stats?.collectedTotal ?? 0),
      icon: Wallet,
      color: "text-purple-600",
      bg: "bg-purple-50",
      sub: `${stats?.collectedCount ?? 0} transações`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-red-100 p-2">
          <Wallet className="h-6 w-6 text-red-600" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Painel Admin</h1>
          <p className="text-sm text-neutral-500">chamou.delivery — visão da plataforma</p>
        </div>
      </div>

      {/* ── Section 1: Overview ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-neutral-500 uppercase">
          Visão geral
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {overviewCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-500">{card.label}</span>
                <div className={`rounded-lg p-1.5 ${card.bg}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} aria-hidden="true" />
                </div>
              </div>
              {statsLoading ? (
                <div className="mt-2 h-7 w-24 animate-pulse rounded bg-neutral-100" />
              ) : (
                <>
                  <p className={`mt-2 text-xl font-bold ${card.color}`}>
                    {typeof card.value === "number" ? card.value : card.value}
                  </p>
                  {"sub" in card && <p className="mt-0.5 text-xs text-neutral-400">{card.sub}</p>}
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 2: Stripe Balance ── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">
            Saldo no Stripe
          </h2>
          <button
            onClick={() => refetchBalance()}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Atualizar
          </button>
        </div>

        {balanceLoading ? (
          <div className="h-28 animate-pulse rounded-2xl bg-neutral-100" />
        ) : balance ? (
          <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
            {!balance.livemode && (
              <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                ⚠️ Modo teste (test mode) — os valores abaixo são simulados pelo Stripe
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-medium text-neutral-500">Disponível</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">
                  {formatCurrency(balance.available)}
                </p>
                <p className="mt-0.5 text-xs text-neutral-400">Pode sacar agora</p>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500">Pendente</p>
                <p className="mt-1 text-2xl font-bold text-amber-500">
                  {formatCurrency(balance.pending)}
                </p>
                <p className="mt-0.5 text-xs text-neutral-400">Liberado em ~2 dias</p>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500">Total em caixa</p>
                <p className="mt-1 text-2xl font-bold text-neutral-900">
                  {formatCurrency(balance.total)}
                </p>
                <p className="mt-0.5 text-xs text-neutral-400">Disponível + pendente</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  setPayoutAmount(balance.available > 0 ? String(balance.available) : "");
                  setShowPayoutForm(true);
                }}
                disabled={balance.available <= 0}
              >
                <ArrowDownToLine className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Solicitar saque
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-100 bg-white p-5 text-sm text-neutral-400">
            Stripe não configurado ou erro ao carregar saldo.
          </div>
        )}

        {/* Payout form */}
        {showPayoutForm && (
          <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <h3 className="mb-3 font-semibold text-neutral-900">Solicitar saque</h3>
            <div className="space-y-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={balance?.available}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  placeholder="Ex: 100.00"
                />
                {balance && (
                  <p className="mt-1 text-xs text-neutral-400">
                    Máximo disponível: {formatCurrency(balance.available)}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  value={payoutDescription}
                  onChange={(e) => setPayoutDescription(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  placeholder="Saque mensal junho/2026"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={() => createPayout.mutate()}
                  loading={createPayout.isPending}
                  disabled={!payoutAmount || parseFloat(payoutAmount) <= 0}
                >
                  Confirmar saque
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPayoutForm(false)}
                  disabled={createPayout.isPending}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Section 3: Payouts list ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-neutral-500 uppercase">
          Histórico de saques
        </h2>
        <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm">
          {payoutsLoading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-neutral-100" />
              ))}
            </div>
          ) : !payoutsData?.length ? (
            <div className="py-12 text-center">
              <ArrowDownToLine
                className="mx-auto mb-3 h-8 w-8 text-neutral-300"
                aria-hidden="true"
              />
              <p className="text-sm text-neutral-400">Nenhum saque realizado ainda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-semibold text-neutral-500">
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Descrição</th>
                    <th className="px-5 py-3">Método</th>
                    <th className="px-5 py-3">Previsão</th>
                    <th className="px-5 py-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {payoutsData.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-50">
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-1.5">
                          {PAYOUT_STATUS_ICON[p.status] ?? null}
                          <span className="text-xs font-medium">
                            {PAYOUT_STATUS_LABEL[p.status] ?? p.status}
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-neutral-600">
                        {p.description ?? "—"}
                        <p className="text-xs text-neutral-400">
                          {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-xs text-neutral-500">
                        {p.method === "instant" ? "⚡ Instantâneo" : "🏦 Padrão"}
                      </td>
                      <td className="px-5 py-3 text-xs text-neutral-500">
                        {new Date(p.arrivalDate).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-neutral-900">
                        {formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── Section 4: Active restaurants ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-neutral-500 uppercase">
          Clientes ativos e em trial
        </h2>
        <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm">
          {statsLoading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-neutral-100" />
              ))}
            </div>
          ) : !stats?.activeRestaurants.length ? (
            <div className="py-12 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 text-neutral-300" aria-hidden="true" />
              <p className="text-sm text-neutral-400">Nenhum restaurante ativo</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-semibold text-neutral-500">
                    <th className="px-5 py-3">Restaurante</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Assinatura Stripe</th>
                    <th className="px-5 py-3">Trial até</th>
                    <th className="px-5 py-3">Cadastrado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {stats.activeRestaurants.map((r) => (
                    <tr key={r.id} className="hover:bg-neutral-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-neutral-900">{r.name}</p>
                        <p className="text-xs text-neutral-400">{r.slug}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[r.status] ?? "bg-neutral-100 text-neutral-500"}`}
                        >
                          {STATUS_LABEL[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {r.hasStripeSubscription ? (
                          <BadgeCheck className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                        ) : (
                          <span className="text-xs text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-neutral-500">
                        {r.trialEndsAt ? new Date(r.trialEndsAt).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="px-5 py-3 text-xs text-neutral-500">
                        {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── Section 5: Fee transactions ── */}
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">
            Taxas de serviço coletadas
          </h2>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Calendar className="h-4 w-4 text-neutral-400" aria-hidden="true" />
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs focus:ring-2 focus:ring-red-400 focus:outline-none"
            />
            <span className="text-xs text-neutral-400">até</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs focus:ring-2 focus:ring-red-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm">
          {statsLoading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-neutral-100" />
              ))}
            </div>
          ) : !stats?.recentFees.length ? (
            <div className="py-12 text-center">
              <Wallet className="mx-auto mb-3 h-8 w-8 text-neutral-300" aria-hidden="true" />
              <p className="text-sm text-neutral-400">Nenhuma taxa no período</p>
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
                    <th className="px-5 py-3 text-right">Taxa</th>
                    <th className="px-5 py-3">Coletado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {stats.recentFees.map((fee) => (
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
                      <td className="px-5 py-3 text-neutral-700">
                        {formatCurrency(fee.orderTotal)}
                      </td>
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
                      Total ({stats.collectedCount}{" "}
                      {stats.collectedCount === 1 ? "transação" : "transações"})
                    </td>
                    <td className="px-5 py-3 text-right text-emerald-600">
                      {formatCurrency(stats.collectedTotal)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
