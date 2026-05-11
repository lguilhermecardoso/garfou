import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import type { Metadata } from "next";
import { BarChart3, TrendingUp, ShoppingBag, Users, Star } from "lucide-react";

export const metadata: Metadata = { title: "Relatórios" };

interface Props {
  params: Promise<{ restaurantId: string }>;
}

export default async function ReportsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { restaurantId } = await params;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [thisMonthAgg, lastMonthAgg, topItemsRaw, npsData, newCustomers] = await Promise.all([
    prisma.order.aggregate({
      where: { restaurantId, createdAt: { gte: startOfMonth }, status: "FINALIZADO" },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.order.aggregate({
      where: { restaurantId, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }, status: "FINALIZADO" },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.orderItem.findMany({
      where: {
        order: { restaurantId, status: "FINALIZADO", createdAt: { gte: startOfMonth } },
      },
      select: { productId: true, quantity: true, unitPrice: true, product: { select: { name: true } } },
    }),
    prisma.npsResponse.aggregate({
      where: { restaurantId, createdAt: { gte: startOfMonth } },
      _avg: { score: true },
      _count: { id: true },
    }),
    prisma.customer.count({
      where: { restaurantId, createdAt: { gte: startOfMonth }, deletedAt: null },
    }),
  ]);

  // Aggregate top products in memory
  const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const item of topItemsRaw) {
    const existing = productMap.get(item.productId);
    const rev = Number(item.unitPrice) * item.quantity;
    if (existing) {
      existing.qty += item.quantity;
      existing.revenue += rev;
    } else {
      productMap.set(item.productId, { name: item.product?.name ?? "—", qty: item.quantity, revenue: rev });
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Relatórios</h1>

      {/* KPIs */}
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
                <p className={`mt-1 text-xs ${kpi.positive ? "text-emerald-600" : "text-red-500"}`}>{kpi.sub}</p>
              </div>
              <div className={`rounded-xl p-2.5 ${kpi.bg}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} aria-hidden="true" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New customers this month */}
      <div className="rounded-2xl bg-white p-5 shadow-sm flex items-center gap-4">
        <div className="rounded-xl bg-blue-50 p-3">
          <Users className="h-5 w-5 text-blue-500" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm text-neutral-500">Novos clientes (mês)</p>
          <p className="text-2xl font-bold text-neutral-900">{newCustomers}</p>
        </div>
      </div>

      {/* Top products */}
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-4 border-b border-neutral-100">
          <h2 className="font-semibold text-neutral-900">Produtos mais vendidos (mês)</h2>
        </div>
        <table className="w-full text-sm" aria-label="Produtos mais vendidos">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-100">
              <th className="px-4 py-3 text-left font-semibold text-neutral-600">#</th>
              <th className="px-4 py-3 text-left font-semibold text-neutral-600">Produto</th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-600">Qtd</th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-600">Receita</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">Nenhuma venda este mês</td>
              </tr>
            ) : (
              topProducts.map((p, i) => (
                <tr key={`${p.name}-${i}`} className="border-b border-neutral-50">
                  <td className="px-4 py-3 text-neutral-400 font-mono">{i + 1}</td>
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
