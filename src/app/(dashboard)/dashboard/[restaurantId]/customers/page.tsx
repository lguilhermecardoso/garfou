import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";
import { Users } from "lucide-react";
import { PaginationControls } from "@/components/shared/pagination-controls";

export const metadata: Metadata = { title: "Clientes" };

interface Props {
  params: Promise<{ restaurantId: string }>;
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>;
}

export default async function CustomersPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { restaurantId } = await params;
  const { q, page: rawPage, pageSize: rawPageSize } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const take = Math.max(1, Number(rawPageSize) || 20);
  const skip = (page - 1) * take;

  const where = {
    restaurantId,
    deletedAt: null as null,
    ...(q
      ? {
          OR: [{ name: { contains: q, mode: "insensitive" as const } }, { phone: { contains: q } }],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: { _count: { select: { orders: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Clientes</h1>
          <p className="text-sm text-neutral-500">{total} clientes cadastrados</p>
        </div>
      </div>

      {/* Search */}
      <form className="flex gap-3" role="search">
        <input
          name="q"
          defaultValue={q}
          type="search"
          placeholder="Buscar por nome ou telefone..."
          className="focus:ring-primary-400 flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:outline-none"
          aria-label="Buscar cliente"
        />
        <button
          type="submit"
          className="bg-primary-500 hover:bg-primary-600 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
        >
          Buscar
        </button>
      </form>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm" aria-label="Lista de clientes">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50">
              <th className="px-4 py-3 text-left font-semibold text-neutral-600">Cliente</th>
              <th className="px-4 py-3 text-left font-semibold text-neutral-600">Telefone</th>
              <th className="px-4 py-3 text-center font-semibold text-neutral-600">Pedidos</th>
              <th className="px-4 py-3 text-left font-semibold text-neutral-600">Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center">
                  <Users className="mx-auto h-8 w-8 text-neutral-300" aria-hidden="true" />
                  <p className="mt-2 text-neutral-400">Nenhum cliente encontrado</p>
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-neutral-900">{c.name}</p>
                    {c.email && <p className="text-xs text-neutral-400">{c.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-primary-50 text-primary-700 inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold">
                      {c._count.orders}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{formatDate(c.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <PaginationControls page={page} pageSize={take} total={total} />
      </div>
    </div>
  );
}
