import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Metadata } from "next";
import { Tag } from "lucide-react";

export const metadata: Metadata = { title: "Cupons" };

interface Props {
  params: Promise<{ restaurantId: string }>;
}

export default async function CouponsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { restaurantId } = await params;

  const coupons = await prisma.coupon.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Cupons</h1>
        <a
          href={`/dashboard/${restaurantId}/coupons/new`}
          className="bg-primary-500 hover:bg-primary-600 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors"
        >
          + Novo cupom
        </a>
      </div>

      {coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-20 shadow-sm">
          <Tag className="h-12 w-12 text-neutral-200" aria-hidden="true" />
          <p className="mt-4 text-neutral-400">Nenhum cupom cadastrado</p>
          <a
            href={`/dashboard/${restaurantId}/coupons/new`}
            className="text-primary-500 mt-4 text-sm font-semibold hover:underline"
          >
            Criar primeiro cupom
          </a>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-sm" aria-label="Lista de cupons">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Código</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Tipo</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-600">Desconto</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-600">Usos</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Validade</th>
                <th className="px-4 py-3 text-center font-semibold text-neutral-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => {
                const expired = c.expiresAt && c.expiresAt < new Date();
                const exhausted = c.maxUses != null && c.usedCount >= c.maxUses;
                const active = c.isActive && !expired && !exhausted;
                return (
                  <tr key={c.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-sm font-semibold text-neutral-900">
                        {c.code}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {c.type === "PERCENTAGE" ? "Porcentagem" : "Valor fixo"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-neutral-900">
                      {c.type === "PERCENTAGE"
                        ? `${Number(c.value)}%`
                        : formatCurrency(Number(c.value))}
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-500">
                      {c.usedCount}
                      {c.maxUses != null ? ` / ${c.maxUses}` : ""}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {c.expiresAt ? formatDate(c.expiresAt) : "Sem vencimento"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${active ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}
                      >
                        {active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
