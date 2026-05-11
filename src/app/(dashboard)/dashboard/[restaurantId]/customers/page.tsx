import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";
import { Users } from "lucide-react";

export const metadata: Metadata = { title: "Clientes" };

interface Props {
  params: Promise<{ restaurantId: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function CustomersPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { restaurantId } = await params;
  const { q, page = "1" } = await searchParams;
  const take = 20;
  const skip = (parseInt(page) - 1) * take;

  const where = {
    restaurantId,
    deletedAt: null as null,
    ...(q
      ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { phone: { contains: q } },
        ],
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
          className="flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          aria-label="Buscar cliente"
        />
        <button type="submit" className="rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600">
          Buscar
        </button>
      </form>

      {/* Table */}
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm" aria-label="Lista de clientes">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-100">
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
                    <span className="inline-flex items-center justify-center rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
                      {c._count.orders}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{formatDate(c.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > take && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500">Página {page} de {Math.ceil(total / take)}</p>
          <div className="flex gap-2">
            {parseInt(page) > 1 && (
              <a href={`?${q ? `q=${q}&` : ""}page=${parseInt(page) - 1}`} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50">Anterior</a>
            )}
            {parseInt(page) < Math.ceil(total / take) && (
              <a href={`?${q ? `q=${q}&` : ""}page=${parseInt(page) + 1}`} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50">Próxima</a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
