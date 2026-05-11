import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NewInventoryItemForm } from "@/features/inventory/new-item-form";

export const metadata: Metadata = { title: "Novo item de estoque" };

interface Props {
  params: Promise<{ restaurantId: string }>;
}

export default async function NewInventoryItemPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { restaurantId } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Novo item de estoque</h1>
        <p className="text-sm text-neutral-500">Cadastre insumos e controles mínimos.</p>
      </div>
      <NewInventoryItemForm restaurantId={restaurantId} />
    </div>
  );
}
