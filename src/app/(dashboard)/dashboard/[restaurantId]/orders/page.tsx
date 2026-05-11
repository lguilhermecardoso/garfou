import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Pedidos" };

interface Props {
  params: Promise<{ restaurantId: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function OrdersPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { restaurantId } = await params;
  const { status, page = "1" } = await searchParams;

  const take = 20;
  const skip = (parseInt(page) - 1) * take;

  const whereBase: Prisma.OrderWhereInput = {
    restaurantId,
    ...(status ? { status: status as Prisma.OrderWhereInput["status"] } : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: whereBase,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where: whereBase }),
  ]);

  const statuses = [
    "NOVO_PEDIDO",
    "AGUARDANDO_CONFIRMACAO",
    "CONFIRMADO",
    "EM_PREPARO",
    "PRONTO",
    "SAIU_PARA_ENTREGA",
    "FINALIZADO",
    "CANCELADO",
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Pedidos</h1>
        <p className="text-sm text-neutral-500">
          {total} pedido{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        <a
          href={`/dashboard/${restaurantId}/orders`}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${!status ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
        >
          Todos
        </a>
        {statuses.map((s) => (
          <a
            key={s}
            href={`/dashboard/${restaurantId}/orders?status=${s}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${status === s ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
          >
            {s.replace(/_/g, " ")}
          </a>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Lista de pedidos">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">#</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Tipo</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Mesa</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Itens</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Total</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Data</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                    Nenhum pedido encontrado
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-neutral-600">#{order.orderNumber}</td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{order.type.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-neutral-600">{order.tableNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-600">{order._count.items}</td>
                    <td className="px-4 py-3 font-semibold text-neutral-900">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {formatDate(order.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > take && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            Página {page} de {Math.ceil(total / take)}
          </p>
          <div className="flex gap-2">
            {parseInt(page) > 1 && (
              <a
                href={`/dashboard/${restaurantId}/orders?${status ? `status=${status}&` : ""}page=${parseInt(page) - 1}`}
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50"
              >
                Anterior
              </a>
            )}
            {parseInt(page) < Math.ceil(total / take) && (
              <a
                href={`/dashboard/${restaurantId}/orders?${status ? `status=${status}&` : ""}page=${parseInt(page) + 1}`}
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50"
              >
                Próxima
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
