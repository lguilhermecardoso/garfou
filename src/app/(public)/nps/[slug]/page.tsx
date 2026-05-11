import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { NpsForm } from "@/features/nps/nps-form";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ order?: string }>;
}

export const metadata: Metadata = { title: "Avalie sua experiência" };

export default async function NpsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { order: orderId } = await searchParams;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug, deletedAt: null },
    select: { id: true, name: true },
  });

  if (!restaurant) notFound();

  return (
    <NpsForm
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      orderId={orderId}
    />
  );
}
