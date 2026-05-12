import { TrackOrdersClient } from "@/features/orders/track-orders-client";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TrackOrdersPage({ params }: Props) {
  const { slug } = await params;

  return <TrackOrdersClient restaurantSlug={slug} />;
}
