import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BillingSection } from "@/features/settings/billing-section";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Assinatura — Garfou" };

interface Props {
  params: Promise<{ restaurantId: string }>;
  searchParams: Promise<{ success?: string; canceled?: string }>;
}

export default async function BillingPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { restaurantId } = await params;
  const { success, canceled } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Configurações</h1>
        <p className="mt-1 text-sm text-neutral-500">Gerencie a assinatura do seu restaurante</p>
      </div>

      {success === "true" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          ✓ Assinatura iniciada com sucesso! Bem-vindo ao Garfou.
        </div>
      )}
      {canceled === "true" && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
          Checkout cancelado. Nenhuma cobrança foi realizada.
        </div>
      )}

      <BillingSection restaurantId={restaurantId} />
    </div>
  );
}
