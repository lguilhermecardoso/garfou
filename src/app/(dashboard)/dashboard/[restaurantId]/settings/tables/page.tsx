import type { Metadata } from "next";
import { TablesSettings } from "@/features/tables/tables-settings";

export const metadata: Metadata = {
  title: "Mesas",
};

interface Props {
  params: Promise<{ restaurantId: string }>;
}

export default async function TablesSettingsPage({ params }: Props) {
  const { restaurantId } = await params;
  return <TablesSettings restaurantId={restaurantId} />;
}
