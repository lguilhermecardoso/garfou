import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  ShoppingBag,
  TrendingUp,
  Clock,
  XCircle,
  DollarSign,
} from "lucide-react";

interface Props {
  params: Promise<{ restaurantId: string }>;
}

export default async function DashboardPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { restaurantId } = await params;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayOrders, pendingOrders] = await Promise.all([
    prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: today },
        status: { not: "CANCELADO" },
      },
      select: { status: true, total: true },
    }),
    prisma.order.count({
      where: {
        restaurantId,
        status: { in: ["NOVO_PEDIDO", "AGUARDANDO_CONFIRMACAO", "CONFIRMADO", "EM_PREPARO"] },
      },
    }),
  ]);

  const todayRevenue = todayOrders.reduce((acc, o) => acc + Number(o.total), 0);
  const canceledToday = todayOrders.filter((o) => o.status === "CANCELADO").length;
  const avgTicket = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;

  const stats = [
    {
      title: "Receita hoje",
      value: formatCurrency(todayRevenue),
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Pedidos hoje",
      value: todayOrders.length.toString(),
      icon: ShoppingBag,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Ticket médio",
      value: formatCurrency(avgTicket),
      icon: TrendingUp,
      color: "text-accent-600",
      bg: "bg-accent-50",
    },
    {
      title: "Pedidos pendentes",
      value: pendingOrders.toString(),
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Cancelamentos hoje",
      value: canceledToday.toString(),
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-neutral-500">Visão geral de hoje</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-neutral-500">{stat.title}</p>
                  <p className="mt-1 text-xl font-bold text-neutral-900">
                    {stat.value}
                  </p>
                </div>
                <div className={`rounded-lg p-2 ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader>
          <CardTitle>Pedidos recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500">
            Veja a lista completa em{" "}
            <a href={`/dashboard/${restaurantId}/orders`} className="text-primary-500 underline">
              Pedidos
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
