import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, TrendingUp, ShoppingBag, Users, Star } from "lucide-react";
import { RevenueChart } from "@/features/reports/revenue-chart";
import { OrdersChart } from "@/features/reports/orders-chart";
import { ExportCsvButton } from "@/features/reports/export-csv-button";
import { DateRangeFilter } from "@/features/finance/date-range-filter";

export const metadata: Metadata = { title: "Relatórios" };

type Period = "7d" | "30d" | "3m";

interface Props {
  params: Promise<{ restaurantId: string }>;
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}

function getPeriodDates(period: Period): { from: Date; label: string } {
  const now = new Date();
  if (period === "7d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    return { from, label: "últimos 7 dias" };
  }
  if (period === "3m") {
    const from = new Date(now);
    from.setMonth(from.getMonth() - 3);
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
    return { from, label: "últimos 3 meses" };
  }
  // 30d (default)
  const from = new Date(now);
  from.setDate(from.getDate() - 29);
  from.setHours(0, 0, 0, 0);
  return { from, label: "últimos 30 dias" };
}

/** Format a JS Date to YYYY-MM-DD string in local time */
function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Format to short label: e.g. "01/05" */
function toShortLabel(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

export default async function ReportsPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { restaurantId } = await params;
  const { period: rawPeriod, from: rawFrom, to: rawTo } = await searchParams;
  const period: Period =
    rawPeriod === "7d" || rawPeriod === "30d" || rawPeriod === "3m" ? rawPeriod : "30d";

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Custom date range overrides period preset for charts
  let periodFrom: Date;
  let periodTo: Date;
  let customRangeActive = false;

  if (rawFrom && rawTo) {
    periodFrom = new Date(rawFrom + "T00:00:00");
    periodTo = new Date(rawTo + "T23:59:59");
    customRangeActive = true;
  } else {
    periodFrom = getPeriodDates(period).from;
    periodTo = now;
  }

  const [thisMonthAgg, lastMonthAgg, topItemsRaw, npsData, newCustomers, periodOrders] =
    await Promise.all([
      prisma.order.aggregate({
        where: { restaurantId, createdAt: { gte: startOfMonth }, status: "FINALIZADO" },
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.order.aggregate({
        where: {
          restaurantId,
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
          status: "FINALIZADO",
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.orderItem.findMany({
        where: {
          order: { restaurantId, status: "FINALIZADO", createdAt: { gte: startOfMonth } },
        },
        select: {
          productId: true,
          quantity: true,
          unitPrice: true,
          product: { select: { name: true } },
        },
      }),
      prisma.npsResponse.aggregate({
        where: { restaurantId, createdAt: { gte: startOfMonth } },
        _avg: { score: true },
        _count: { id: true },
      }),
      prisma.customer.count({
        where: { restaurantId, createdAt: { gte: startOfMonth }, deletedAt: null },
      }),
      // Fetch orders in selected period for charts
      prisma.order.findMany({
        where: {
          restaurantId,
          createdAt: { gte: periodFrom, lte: periodTo },
          status: "FINALIZADO",
        },
        select: { createdAt: true, total: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  // Aggregate orders by day for charts
  const revenueByDay = new Map<string, number>();
  const countByDay = new Map<string, number>();

  // Pre-fill all days in the period with 0
  const cursor = new Date(periodFrom);
  cursor.setHours(0, 0, 0, 0);
  const periodToMidnight = new Date(periodTo);
  periodToMidnight.setHours(0, 0, 0, 0);
  while (cursor <= periodToMidnight) {
    const key = toLocalDateStr(cursor);
    revenueByDay.set(key, 0);
    countByDay.set(key, 0);
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const order of periodOrders) {
    const key = toLocalDateStr(new Date(order.createdAt));
    revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + Number(order.total));
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
  }

  const revenueChartData = Array.from(revenueByDay.entries()).map(([date, revenue]) => ({
    date: toShortLabel(date),
    revenue: Math.round(revenue * 100) / 100,
  }));

  const ordersChartData = Array.from(countByDay.entries()).map(([date, count]) => ({
    date: toShortLabel(date),
    count,
  }));

  // Aggregate top products in memory
  const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const item of topItemsRaw) {
    const existing = productMap.get(item.productId);
    const rev = Number(item.unitPrice) * item.quantity;
    if (existing) {
      existing.qty += item.quantity;
      existing.revenue += rev;
    } else {
      productMap.set(item.productId, {
        name: item.product?.name ?? "—",
        qty: item.quantity,
        revenue: rev,
      });
    }
  }
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  const thisRevenue = Number(thisMonthAgg._sum.total ?? 0);
  const lastRevenue = Number(lastMonthAgg._sum.total ?? 0);
  const revenueGrowth = lastRevenue > 0 ? ((thisRevenue - lastRevenue) / lastRevenue) * 100 : 0;
  const thisCount = thisMonthAgg._count.id;
  const lastCount = lastMonthAgg._count.id;
  const ticketAvg = thisCount > 0 ? thisRevenue / thisCount : 0;
  const avgScore = npsData._avg.score;
  const npsCount = npsData._count.id;

  const periodOptions: { value: Period; label: string }[] = [
    { value: "7d", label: "7 dias" },
    { value: "30d", label: "30 dias" },
    { value: "3m", label: "3 meses" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Relatórios</h1>

      {/* Date range filter */}
      <DateRangeFilter preserveParams={["period"]} />

      {/* KPIs — always show current month */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: "Faturamento (mês)",
            value: formatCurrency(Math.round(thisRevenue * 100)),
            sub: `${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth.toFixed(1)}% vs mês anterior`,
            positive: revenueGrowth >= 0,
            icon: TrendingUp,
            color: "text-emerald-500",
            bg: "bg-emerald-50",
          },
          {
            label: "Pedidos finalizados",
            value: String(thisCount),
            sub: `vs ${lastCount} no mês anterior`,
            positive: thisCount >= lastCount,
            icon: ShoppingBag,
            color: "text-primary-500",
            bg: "bg-primary-50",
          },
          {
            label: "Ticket médio",
            value: formatCurrency(Math.round(ticketAvg * 100)),
            sub: "por pedido finalizado",
            positive: true,
            icon: BarChart3,
            color: "text-accent-600",
            bg: "bg-accent-50",
          },
          {
            label: "NPS médio",
            value: avgScore !== null ? avgScore.toFixed(1) : "—",
            sub: `${npsCount} avaliações`,
            positive: (avgScore ?? 0) >= 7,
            icon: Star,
            color: "text-accent-500",
            bg: "bg-accent-50",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-500">{kpi.label}</p>
                <p className="mt-1 text-2xl font-bold text-neutral-900">{kpi.value}</p>
                <p className={`mt-1 text-xs ${kpi.positive ? "text-emerald-600" : "text-red-500"}`}>
                  {kpi.sub}
                </p>
              </div>
              <div className={`rounded-xl p-2.5 ${kpi.bg}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} aria-hidden="true" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New customers this month */}
      <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="rounded-xl bg-blue-50 p-3">
          <Users className="h-5 w-5 text-blue-500" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm text-neutral-500">Novos clientes (mês)</p>
          <p className="text-2xl font-bold text-neutral-900">{newCustomers}</p>
        </div>
      </div>

      {/* Charts section */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        {/* Period selector */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-neutral-900">
            Evolução no período
            {customRangeActive && (
              <span className="text-primary-600 ml-2 text-xs font-normal">
                (filtro personalizado)
              </span>
            )}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <ExportCsvButton
              restaurantId={restaurantId}
              type="orders"
              period={period}
              label="Exportar pedidos"
            />
            {!customRangeActive && (
              <div className="flex gap-1.5 rounded-xl border border-neutral-200 p-1">
                {periodOptions.map((opt) => (
                  <Link
                    key={opt.value}
                    href={`?period=${opt.value}`}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                      period === opt.value
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-500 hover:bg-neutral-100"
                    }`}
                  >
                    {opt.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Revenue chart */}
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold text-neutral-500">Faturamento diário (R$)</p>
          <RevenueChart data={revenueChartData} />
        </div>

        {/* Orders volume chart */}
        <div>
          <p className="mb-2 text-xs font-semibold text-neutral-500">
            Volume de pedidos finalizados
          </p>
          <OrdersChart data={ordersChartData} />
        </div>
      </div>

      {/* Top products */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-4">
          <h2 className="font-semibold text-neutral-900">Produtos mais vendidos (mês)</h2>
          <ExportCsvButton
            restaurantId={restaurantId}
            type="finance"
            period={period}
            label="Exportar financeiro"
          />
        </div>
        <table className="w-full text-sm" aria-label="Produtos mais vendidos">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50">
              <th className="px-4 py-3 text-left font-semibold text-neutral-600">#</th>
              <th className="px-4 py-3 text-left font-semibold text-neutral-600">Produto</th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-600">Qtd</th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-600">Receita</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                  Nenhuma venda este mês
                </td>
              </tr>
            ) : (
              topProducts.map((p, i) => (
                <tr key={`${p.name}-${i}`} className="border-b border-neutral-50">
                  <td className="px-4 py-3 font-mono text-neutral-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-neutral-900">{p.name}</td>
                  <td className="px-4 py-3 text-right text-neutral-700">{p.qty}</td>
                  <td className="px-4 py-3 text-right font-semibold text-neutral-900">
                    {formatCurrency(Math.round(p.revenue * 100))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
