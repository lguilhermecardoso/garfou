import type { Metadata } from "next";
import { MenuManagement } from "@/features/menu/menu-management";

export const metadata: Metadata = { title: "Cardápio" };

interface Props {
  params: Promise<{ restaurantId: string }>;
}

export default async function MenuPage({ params }: Props) {
  const { restaurantId } = await params;
  return <MenuManagement restaurantId={restaurantId} />;
}
