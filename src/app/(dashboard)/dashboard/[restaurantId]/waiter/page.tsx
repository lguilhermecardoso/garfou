import type { Metadata } from "next";
import WaiterApp from "@/features/waiter/waiter-app";

export const metadata: Metadata = {
  title: "App do Garçom",
};

interface Props {
  params: Promise<{ restaurantId: string }>;
  searchParams: Promise<{ table?: string }>;
}

export default async function WaiterPage({ params, searchParams }: Props) {
  const { restaurantId } = await params;
  const { table } = await searchParams;
  return <WaiterApp restaurantId={restaurantId} tableNumber={table} />;
}
