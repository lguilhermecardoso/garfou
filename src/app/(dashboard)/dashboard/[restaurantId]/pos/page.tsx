import type { Metadata } from "next";
import { PosDashboard } from "@/features/pos/pos-dashboard";

export const metadata: Metadata = {
  title: "PDV",
};

interface Props {
  params: Promise<{ restaurantId: string }>;
}

export default async function PosPage({ params }: Props) {
  const { restaurantId } = await params;
  return <PosDashboard restaurantId={restaurantId} />;
}
