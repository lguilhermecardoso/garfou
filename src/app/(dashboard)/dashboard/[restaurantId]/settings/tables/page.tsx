import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { TablesSettings } from "@/features/tables/tables-settings";

export const metadata: Metadata = {
  title: "Mesas",
};

interface Props {
  params: Promise<{ restaurantId: string }>;
}

export default async function TablesSettingsPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const { restaurantId } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { slug: true },
  });

  if (!restaurant) redirect("/dashboard");

  return <TablesSettings restaurantId={restaurantId} restaurantSlug={restaurant.slug} />;
}
