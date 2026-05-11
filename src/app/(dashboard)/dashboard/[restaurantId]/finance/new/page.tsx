import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NewFinanceEntryForm } from "@/features/finance/new-entry-form";

export const metadata: Metadata = { title: "Novo lançamento" };

interface Props {
  params: Promise<{ restaurantId: string }>;
}

export default async function NewFinanceEntryPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { restaurantId } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Novo lançamento financeiro</h1>
        <p className="text-sm text-neutral-500">Registre receitas e despesas do restaurante.</p>
      </div>
      <NewFinanceEntryForm restaurantId={restaurantId} />
    </div>
  );
}
