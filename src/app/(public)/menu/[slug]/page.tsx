import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DigitalMenuClient } from "@/features/menu/digital-menu-client";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug, deletedAt: null },
    select: { name: true },
  });
  return {
    title: restaurant ? `Cardápio — ${restaurant.name}` : "Cardápio",
  };
}

export default async function DigitalMenuPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { table } = await searchParams;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      banner: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      isOpen: true,
      settings: true,
    },
  });

  if (!restaurant) notFound();

  return (
    <DigitalMenuClient
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      restaurantLogo={restaurant.logo}
      restaurantBanner={restaurant.banner}
      restaurantPhone={restaurant.phone}
      restaurantAddress={restaurant.address}
      restaurantCity={restaurant.city}
      restaurantState={restaurant.state}
      isOpen={restaurant.isOpen}
      isDeliveryOnly={(restaurant.settings as Record<string, unknown>)?.isDeliveryOnly === true}
      tableNumber={table}
    />
  );
}
