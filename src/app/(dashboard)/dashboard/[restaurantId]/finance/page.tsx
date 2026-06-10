import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Metadata } from "next";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { DateRangeFilter } from "@/features/finance/date-range-filter";

export const metadata: Metadata = { title: "Financeiro" };

interface Props {
  params: Promise<{ restaurantId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function FinancePage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { restaurantId } = await params;
  const { from: rawFrom, to: rawTo } = await searchParams;

  const now = new Date();

  // Parse dates from searchParams; default to current month
  let startDate: Date;
  let endDate: Date;
  let periodLabel: string;

  if (rawFrom && rawTo) {
    startDate = new Date(rawFrom + "T00:00:00");
    endDate = new Date(rawTo + "T23:59:59");
    // Build a readable label
    const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    periodLabel = rawFrom === rawTo ? fmt(startDate) : `${fmt(startDate)} – ${fmt(endDate)}`;
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    periodLabel = "mês atual";
  }

  const entries = await prisma.financeEntry.findMany({
    where: { restaurantId, date: { gte: startDate, lte: endDate } },
    orderBy: { date: "desc" },
    take: 200,
  });

  const toNum = (v: unknown) => (typeof v === "number" ? v : Number(v));
  const income = entries
    .filter((e) => e.type === "REVENUE")
    .reduce((a, e) => a + toNum(e.amount), 0);
  const expense = entries
    .filter((e) => e.type === "EXPENSE")
    .reduce((a, e) => a + toNum(e.amount), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Financeiro</h1>

      {/* Date range filter */}
      <DateRangeFilter />

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">Receitas ({periodLabel})</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{formatCurrency(income)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3">
              <TrendingUp className="h-5 w-5 text-emerald-500" aria-hidden="true" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">Despesas ({periodLabel})</p>
              <p className="mt-1 text-2xl font-bold text-red-500">{formatCurrency(expense)}</p>
            </div>
            <div className="rounded-xl bg-red-50 p-3">
              <TrendingDown className="h-5 w-5 text-red-500" aria-hidden="true" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">Saldo</p>
              <p
                className={`mt-1 text-2xl font-bold ${income - expense >= 0 ? "text-neutral-900" : "text-red-500"}`}
              >
                {formatCurrency(income - expense)}
              </p>
            </div>
            <div className="rounded-xl bg-neutral-100 p-3">
              <DollarSign className="h-5 w-5 text-neutral-500" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      {/* Entries table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-4">
          <h2 className="font-semibold text-neutral-900">Lançamentos — {periodLabel}</h2>
          <a
            href={`/dashboard/${restaurantId}/finance/new`}
            className="bg-primary-500 hover:bg-primary-600 rounded-xl px-3 py-1.5 text-sm font-semibold text-white transition-colors"
          >
            + Novo lançamento
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Lançamentos financeiros">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Data</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Descrição</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Categoria</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Tipo</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-600">Valor</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                    Nenhum lançamento neste período
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                    <td className="px-4 py-3 text-neutral-500">{formatDate(e.date)}</td>
                    <td className="px-4 py-3 font-medium text-neutral-900">{e.description}</td>
                    <td className="px-4 py-3 text-neutral-500">{e.category ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${e.type === "REVENUE" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}
                      >
                        {e.type === "REVENUE" ? "Receita" : "Despesa"}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${e.type === "REVENUE" ? "text-emerald-600" : "text-red-500"}`}
                    >
                      {e.type === "REVENUE" ? "+" : "-"}
                      {formatCurrency(toNum(e.amount))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
