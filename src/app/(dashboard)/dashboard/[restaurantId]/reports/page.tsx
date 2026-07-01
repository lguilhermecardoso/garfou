import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency, startOfDayBRT, toBRTDateStr, brtDateStrToUTC } from "@/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  ShoppingBag,
  Users,
  Star,
  Bike,
  UtensilsCrossed,
  ShoppingBag as Takeout,
  XCircle,
  Banknote,
  CreditCard,
  Smartphone,
  Receipt,
} from "lucide-react";
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

function getPeriodDates(period: Period, now: Date): { from: Date; to: Date } {
  const todayBRT = startOfDayBRT(now);
  if (period === "7d") {
    const from = new Date(todayBRT);
    from.setUTCDate(from.getUTCDate() - 6);
    return { from, to: now };
  }
  if (period === "3m") {
    const from = new Date(todayBRT);
    from.setUTCMonth(from.getUTCMonth() - 3);
    from.setUTCDate(1);
    return { from, to: now };
  }
  // 30d (default)
  const from = new Date(todayBRT);
  from.setUTCDate(from.getUTCDate() - 29);
  return { from, to: now };
}

/** Format to short label: e.g. "01/05" */
function toShortLabel(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

function formatGrowth(current: number, previous: number): { text: string; positive: boolean } {
  if (previous === 0) {
    return current > 0
      ? { text: "novo neste período", positive: true }
      : { text: "sem dados anteriores", positive: true };
  }
  const pct = ((current - previous) / previous) * 100;
  return {
    text: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% vs período anterior`,
    positive: pct >= 0,
  };
}

const PAYMENT_LABELS: Record<string, string> = {
  PIX: "PIX",
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartão de Crédito",
  DEBIT_CARD: "Cartão de Débito",
  VOUCHER: "Vale/Voucher",
};

const PAYMENT_ICONS: Record<string, typeof Smartphone> = {
  PIX: Smartphone,
  CASH: Banknote,
  CREDIT_CARD: CreditCard,
  DEBIT_CARD: CreditCard,
  VOUCHER: Receipt,
};

export default async function ReportsPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { restaurantId } = await params;
  const { period: rawPeriod, from: rawFrom, to: rawTo } = await searchParams;
  const period: Period =
    rawPeriod === "7d" || rawPeriod === "30d" || rawPeriod === "3m" ? rawPeriod : "30d";

  const now = new Date();

  // Resolve selected period boundaries
  let periodFrom: Date;
  let periodTo: Date;
  let customRangeActive = false;

  if (rawFrom && rawTo) {
    periodFrom = brtDateStrToUTC(rawFrom);
    periodTo = new Date(rawTo + "T23:59:59-03:00");
    customRangeActive = true;
  } else {
    const pd = getPeriodDates(period, now);
    periodFrom = pd.from;
    periodTo = pd.to;
  }

  // Previous period of equal duration for comparison
  const durationMs = periodTo.getTime() - periodFrom.getTime();
  const prevTo = new Date(periodFrom.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - durationMs);

  const baseWhere = {
    restaurantId,
    createdAt: { gte: periodFrom, lte: periodTo },
  } as const;

  const prevBaseWhere = {
    restaurantId,
    createdAt: { gte: prevFrom, lte: prevTo },
  } as const;

  const [
    // Current period
    periodAgg,
    cancelledCount,
    allOrdersInPeriod,
    topItemsRaw,
    npsData,
    newCustomers,
    // Previous period for comparison
    prevAgg,
    prevCancelledCount,
    // Charts
    periodOrdersForChart,
  ] = await Promise.all([
    // Faturamento + pedidos do período (somente finalizados)
    prisma.order.aggregate({
      where: { ...baseWhere, status: "FINALIZADO" },
      _sum: { total: true, deliveryFee: true },
      _count: { id: true },
    }),
    // Cancelados no período
    prisma.order.count({
      where: { ...baseWhere, status: "CANCELADO" },
    }),
    // Todos os pedidos finalizados com type + paymentMethod para breakdowns
    prisma.order.findMany({
      where: { ...baseWhere, status: "FINALIZADO" },
      select: {
        type: true,
        paymentMethod: true,
        total: true,
        subtotal: true,
        deliveryFee: true,
        discount: true,
      },
    }),
    // Top produtos
    prisma.orderItem.findMany({
      where: {
        order: {
          restaurantId,
          status: "FINALIZADO",
          createdAt: { gte: periodFrom, lte: periodTo },
        },
      },
      select: {
        productId: true,
        quantity: true,
        unitPrice: true,
        product: { select: { name: true } },
      },
    }),
    // NPS
    prisma.npsResponse.aggregate({
      where: { restaurantId, createdAt: { gte: periodFrom, lte: periodTo } },
      _avg: { score: true },
      _count: { id: true },
    }),
    // Novos clientes
    prisma.customer.count({
      where: { restaurantId, createdAt: { gte: periodFrom, lte: periodTo }, deletedAt: null },
    }),
    // Período anterior para comparação
    prisma.order.aggregate({
      where: { ...prevBaseWhere, status: "FINALIZADO" },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.order.count({
      where: { ...prevBaseWhere, status: "CANCELADO" },
    }),
    // Gráficos
    prisma.order.findMany({
      where: { ...baseWhere, status: "FINALIZADO" },
      select: { createdAt: true, total: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // ── KPI calculations ──────────────────────────────────────────────
  const thisRevenue = Number(periodAgg._sum.total ?? 0);
  const thisCount = periodAgg._count.id;
  const ticketAvg = thisCount > 0 ? thisRevenue / thisCount : 0;

  const prevRevenue = Number(prevAgg._sum.total ?? 0);
  const prevCount = prevAgg._count.id;

  const totalOrdersInPeriod = thisCount + cancelledCount;
  const cancellationRate =
    totalOrdersInPeriod > 0 ? (cancelledCount / totalOrdersInPeriod) * 100 : 0;
  const prevTotalOrders = prevCount + prevCancelledCount;
  const prevCancellationRate =
    prevTotalOrders > 0 ? (prevCancelledCount / prevTotalOrders) * 100 : 0;

  // ── By order type ─────────────────────────────────────────────────
  const byType = {
    DINE_IN: { count: 0, revenue: 0 },
    TAKEOUT: { count: 0, revenue: 0 },
    DELIVERY: { count: 0, revenue: 0, feeTotal: 0 },
  };
  for (const o of allOrdersInPeriod) {
    const t = o.type as keyof typeof byType;
    if (!byType[t]) continue;
    byType[t].count++;
    byType[t].revenue += Number(o.total);
    if (t === "DELIVERY") byType.DELIVERY.feeTotal += Number(o.deliveryFee);
  }

  // ── By payment method ────────────────────────────────────────────
  const byPayment: Record<string, { count: number; revenue: number }> = {};
  let nullPaymentCount = 0;
  for (const o of allOrdersInPeriod) {
    const pm = o.paymentMethod ?? null;
    if (!pm) {
      nullPaymentCount++;
      continue;
    }
    if (!byPayment[pm]) byPayment[pm] = { count: 0, revenue: 0 };
    byPayment[pm].count++;
    byPayment[pm].revenue += Number(o.total);
  }
  const paymentEntries = Object.entries(byPayment).sort((a, b) => b[1].revenue - a[1].revenue);

  // ── Top products ─────────────────────────────────────────────────
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

  // ── Chart data ────────────────────────────────────────────────────
  const revenueByDay = new Map<string, number>();
  const countByDay = new Map<string, number>();

  const cursor = startOfDayBRT(periodFrom);
  const periodToDay = startOfDayBRT(periodTo);
  while (cursor <= periodToDay) {
    const key = toBRTDateStr(cursor);
    revenueByDay.set(key, 0);
    countByDay.set(key, 0);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  for (const order of periodOrdersForChart) {
    const key = toBRTDateStr(new Date(order.createdAt));
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

  // ── NPS ───────────────────────────────────────────────────────────
  const avgScore = npsData._avg.score;
  const npsCount = npsData._count.id;

  const periodOptions: { value: Period; label: string }[] = [
    { value: "7d", label: "7 dias" },
    { value: "30d", label: "30 dias" },
    { value: "3m", label: "3 meses" },
  ];

  const revenueGrowth = formatGrowth(thisRevenue, prevRevenue);
  const ordersGrowth = formatGrowth(thisCount, prevCount);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Relatórios</h1>
        <div className="flex gap-2">
          <ExportCsvButton
            restaurantId={restaurantId}
            type="orders"
            period={period}
            label="Exportar pedidos"
          />
          <ExportCsvButton
            restaurantId={restaurantId}
            type="finance"
            period={period}
            label="Exportar financeiro"
          />
        </div>
      </div>

      {/* Date range filter */}
      <DateRangeFilter preserveParams={["period"]} />

      {/* Period preset selector (only when no custom range) */}
      {!customRangeActive && (
        <div className="flex w-fit gap-1.5 rounded-xl border border-neutral-200 bg-white p-1 shadow-sm">
          {periodOptions.map((opt) => (
            <Link
              key={opt.value}
              href={`?period=${opt.value}`}
              className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
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

      {/* ── KPIs principais ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Faturamento */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-500">Faturamento</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">
                {formatCurrency(thisRevenue)}
              </p>
              <p
                className={`mt-1 text-xs ${revenueGrowth.positive ? "text-emerald-600" : "text-red-500"}`}
              >
                {revenueGrowth.text}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-2.5">
              <TrendingUp className="h-5 w-5 text-emerald-500" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Pedidos finalizados */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-500">Pedidos finalizados</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{thisCount}</p>
              <p
                className={`mt-1 text-xs ${ordersGrowth.positive ? "text-emerald-600" : "text-red-500"}`}
              >
                {ordersGrowth.text}
              </p>
            </div>
            <div className="bg-primary-50 rounded-xl p-2.5">
              <ShoppingBag className="text-primary-500 h-5 w-5" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Ticket médio */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-500">Ticket médio</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">
                {formatCurrency(ticketAvg)}
              </p>
              <p className="mt-1 text-xs text-neutral-400">por pedido finalizado</p>
            </div>
            <div className="bg-accent-50 rounded-xl p-2.5">
              <BarChart3 className="text-accent-600 h-5 w-5" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Cancelamentos */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-500">Cancelamentos</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{cancelledCount}</p>
              <p
                className={`mt-1 text-xs ${cancellationRate > 5 ? "text-red-500" : "text-neutral-400"}`}
              >
                {cancellationRate.toFixed(1)}% do total
                {prevCancellationRate > 0 && ` (ant. ${prevCancellationRate.toFixed(1)}%)`}
              </p>
            </div>
            <div className="rounded-xl bg-red-50 p-2.5">
              <XCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Breakdown por tipo de pedido ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Mesa */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-xl bg-blue-50 p-2">
              <UtensilsCrossed className="h-4 w-4 text-blue-500" aria-hidden="true" />
            </div>
            <p className="font-semibold text-neutral-800">Mesa (salão)</p>
          </div>
          <p className="text-2xl font-bold text-neutral-900">
            {formatCurrency(byType.DINE_IN.revenue)}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {byType.DINE_IN.count} pedido{byType.DINE_IN.count !== 1 ? "s" : ""}
          </p>
          {thisRevenue > 0 && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-blue-400"
                style={{ width: `${(byType.DINE_IN.revenue / thisRevenue) * 100}%` }}
              />
            </div>
          )}
          {thisRevenue > 0 && (
            <p className="mt-1 text-xs text-neutral-400">
              {((byType.DINE_IN.revenue / thisRevenue) * 100).toFixed(1)}% do faturamento
            </p>
          )}
        </div>

        {/* Balcão */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-xl bg-amber-50 p-2">
              <Takeout className="h-4 w-4 text-amber-500" aria-hidden="true" />
            </div>
            <p className="font-semibold text-neutral-800">Balcão (retirada)</p>
          </div>
          <p className="text-2xl font-bold text-neutral-900">
            {formatCurrency(byType.TAKEOUT.revenue)}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {byType.TAKEOUT.count} pedido{byType.TAKEOUT.count !== 1 ? "s" : ""}
          </p>
          {thisRevenue > 0 && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-amber-400"
                style={{ width: `${(byType.TAKEOUT.revenue / thisRevenue) * 100}%` }}
              />
            </div>
          )}
          {thisRevenue > 0 && (
            <p className="mt-1 text-xs text-neutral-400">
              {((byType.TAKEOUT.revenue / thisRevenue) * 100).toFixed(1)}% do faturamento
            </p>
          )}
        </div>

        {/* Delivery */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-xl bg-green-50 p-2">
              <Bike className="h-4 w-4 text-green-600" aria-hidden="true" />
            </div>
            <p className="font-semibold text-neutral-800">Delivery</p>
          </div>
          <p className="text-2xl font-bold text-neutral-900">
            {formatCurrency(byType.DELIVERY.revenue)}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {byType.DELIVERY.count} pedido{byType.DELIVERY.count !== 1 ? "s" : ""}
          </p>
          {byType.DELIVERY.feeTotal > 0 && (
            <p className="mt-1 text-xs text-emerald-600">
              + {formatCurrency(byType.DELIVERY.feeTotal)} em taxas de entrega
            </p>
          )}
          {thisRevenue > 0 && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-green-500"
                style={{ width: `${(byType.DELIVERY.revenue / thisRevenue) * 100}%` }}
              />
            </div>
          )}
          {thisRevenue > 0 && (
            <p className="mt-1 text-xs text-neutral-400">
              {((byType.DELIVERY.revenue / thisRevenue) * 100).toFixed(1)}% do faturamento
            </p>
          )}
        </div>
      </div>

      {/* ── Charts ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-semibold text-neutral-900">
            Evolução no período
            {customRangeActive && (
              <span className="text-primary-600 ml-2 text-xs font-normal">
                (filtro personalizado)
              </span>
            )}
          </h2>
        </div>

        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold text-neutral-500">Faturamento diário (R$)</p>
          <RevenueChart data={revenueChartData} />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-neutral-500">
            Volume de pedidos finalizados
          </p>
          <OrdersChart data={ordersChartData} />
        </div>
      </div>

      {/* ── Métodos de pagamento ─────────────────────────────────────── */}
      {paymentEntries.length > 0 && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-neutral-900">Métodos de pagamento</h2>
          <div className="space-y-3">
            {paymentEntries.map(([pm, data]) => {
              const Icon = PAYMENT_ICONS[pm] ?? Receipt;
              const pct = thisRevenue > 0 ? (data.revenue / thisRevenue) * 100 : 0;
              return (
                <div key={pm}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                      <span className="font-medium text-neutral-700">
                        {PAYMENT_LABELS[pm] ?? pm}
                      </span>
                      <span className="text-neutral-400">
                        {data.count} pedido{data.count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-neutral-400">{pct.toFixed(1)}%</span>
                      <span className="font-semibold text-neutral-900">
                        {formatCurrency(data.revenue)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="bg-primary-400 h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {nullPaymentCount > 0 && (
              <p className="text-xs text-neutral-400">
                + {nullPaymentCount} pedido{nullPaymentCount !== 1 ? "s" : ""} sem método registrado
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Produtos mais vendidos ───────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-4">
          <h2 className="font-semibold text-neutral-900">Produtos mais vendidos no período</h2>
        </div>
        <table className="w-full text-sm" aria-label="Produtos mais vendidos">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50">
              <th className="px-4 py-3 text-left font-semibold text-neutral-600">#</th>
              <th className="px-4 py-3 text-left font-semibold text-neutral-600">Produto</th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-600">Qtd vendida</th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-600">Receita</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                  Nenhuma venda no período selecionado
                </td>
              </tr>
            ) : (
              topProducts.map((p, i) => (
                <tr
                  key={`${p.name}-${i}`}
                  className="border-b border-neutral-50 hover:bg-neutral-50"
                >
                  <td className="px-4 py-3 font-mono text-sm text-neutral-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-neutral-900">{p.name}</td>
                  <td className="px-4 py-3 text-right text-neutral-700">{p.qty}</td>
                  <td className="px-4 py-3 text-right font-semibold text-neutral-900">
                    {formatCurrency(p.revenue)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── NPS + Novos clientes ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-500">NPS médio</p>
              <p className="mt-1 text-3xl font-bold text-neutral-900">
                {avgScore !== null ? avgScore.toFixed(1) : "—"}
                <span className="ml-1 text-sm font-normal text-neutral-400">/ 10</span>
              </p>
              <p className="mt-1 text-xs text-neutral-400">{npsCount} avaliações no período</p>
              {avgScore !== null && (
                <p
                  className={`mt-1 text-xs font-medium ${avgScore >= 9 ? "text-emerald-600" : avgScore >= 7 ? "text-amber-500" : "text-red-500"}`}
                >
                  {avgScore >= 9 ? "Promotores" : avgScore >= 7 ? "Neutros" : "Detratores"}
                </p>
              )}
            </div>
            <div className="bg-accent-50 rounded-xl p-2.5">
              <Star className="text-accent-500 h-5 w-5" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-500">Novos clientes</p>
              <p className="mt-1 text-3xl font-bold text-neutral-900">{newCustomers}</p>
              <p className="mt-1 text-xs text-neutral-400">cadastrados no período</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-2.5">
              <Users className="h-5 w-5 text-blue-500" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
