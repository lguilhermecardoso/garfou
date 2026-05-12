import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { DeliveryZonesClient } from "@/features/delivery/delivery-zones-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Zonas de entrega" };

interface Props {
  params: Promise<{ restaurantId: string }>;
}

export default async function DeliveryPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { restaurantId } = await params;

  const zones = await prisma.deliveryZone.findMany({
    where: { restaurantId },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Zonas de entrega</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Gerencie os bairros e taxas de entrega disponíveis.
          </p>
        </div>
      </div>

      <DeliveryZonesClient restaurantId={restaurantId} initialZones={zones} />
    </div>
  );
}
