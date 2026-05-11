import type { Metadata } from "next";
import KitchenScreen from "@/features/kitchen/kitchen-screen";

export const metadata: Metadata = {
  title: "Tela da Cozinha",
};

interface Props {
  params: Promise<{ restaurantId: string }>;
}

export default async function KitchenPage({ params }: Props) {
  const { restaurantId } = await params;
  return <KitchenScreen restaurantId={restaurantId} />;
}
