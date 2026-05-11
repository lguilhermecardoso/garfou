import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";
import { Star } from "lucide-react";

export const metadata: Metadata = { title: "NPS" };

interface Props {
  params: Promise<{ restaurantId: string }>;
}

const scoreLabel = (score: number) => {
  if (score >= 9) return { label: "Promotor", className: "bg-emerald-50 text-emerald-700" };
  if (score >= 7) return { label: "Neutro", className: "bg-amber-50 text-amber-700" };
  return { label: "Detrator", className: "bg-red-50 text-red-600" };
};

export default async function NpsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { restaurantId } = await params;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const responses = await prisma.npsResponse.findMany({
    where: { restaurantId, createdAt: { gte: startOfMonth } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const promoters = responses.filter((r) => r.score >= 9).length;
  const detractors = responses.filter((r) => r.score <= 6).length;
  const total = responses.length;
  const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : null;
  const avg = total > 0 ? responses.reduce((a, r) => a + r.score, 0) / total : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">NPS</h1>

      {/* Score summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "NPS Score", value: nps !== null ? String(nps) : "—", color: nps !== null && nps >= 50 ? "text-emerald-600" : nps !== null && nps >= 0 ? "text-amber-600" : "text-red-500" },
          { label: "Nota média", value: avg !== null ? avg.toFixed(1) : "—", color: "text-neutral-900" },
          { label: "Respostas", value: String(total), color: "text-neutral-900" },
          { label: "Promotores", value: `${promoters} (${total > 0 ? Math.round((promoters / total) * 100) : 0}%)`, color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-5 shadow-sm text-center">
            <p className="text-sm text-neutral-500">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Responses */}
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-4 border-b border-neutral-100">
          <h2 className="font-semibold text-neutral-900">Respostas recentes (mês)</h2>
        </div>
        {responses.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Star className="h-10 w-10 text-neutral-200" aria-hidden="true" />
            <p className="mt-3 text-neutral-400">Nenhuma resposta este mês</p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-50">
            {responses.map((r) => {
              const { label, className } = scoreLabel(r.score);
              return (
                <li key={r.id} className="flex items-start gap-4 px-4 py-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold ${r.score >= 9 ? "bg-emerald-100 text-emerald-700" : r.score >= 7 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>
                    {r.score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{label}</span>
                      <span className="text-xs text-neutral-400">{formatDate(r.createdAt)}</span>
                    </div>
                    {r.comment && <p className="mt-1 text-sm text-neutral-600">&ldquo;{r.comment}&rdquo;</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
