import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface Params {
  params: Promise<{ restaurantId: string }>;
}

/**
 * GET /api/restaurants/[restaurantId]/delivery-zones
 *
 * Calculates delivery fee based on neighborhood and city
 * Query params:
 * - neighborhood: string
 * - city: string
 *
 * Returns:
 * - { fee: number } - Delivery fee amount
 * - { fee: null, error: string } - If zone not found
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { restaurantId } = await params;
    const { searchParams } = new URL(req.url);

    const neighborhood = searchParams.get("neighborhood");
    const city = searchParams.get("city");

    if (!neighborhood || !city) {
      return NextResponse.json({ error: "neighborhood e city são obrigatórios" }, { status: 400 });
    }

    // First, check if restaurant has any delivery zones configured
    const deliveryZones = await prisma.deliveryZone.findMany({
      where: {
        restaurantId,
        isActive: true,
      },
    });

    if (deliveryZones.length === 0) {
      // No zones configured, check restaurant default delivery fee
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { settings: true },
      });

      const settings = (restaurant?.settings as { defaultDeliveryFee?: number }) ?? {};
      const defaultFee = settings.defaultDeliveryFee ?? 0;

      return NextResponse.json({ fee: defaultFee });
    }

    // Find matching zone by neighborhood (case-insensitive)
    // Check both zone.neighborhoods array and zone.name
    const matchingZone = deliveryZones.find((zone) => {
      // Check if zone name matches neighborhood
      if (zone.name.toLowerCase() === neighborhood.toLowerCase()) {
        return true;
      }

      // Check if neighborhood is in zone.neighborhoods array
      const zoneNeighborhoods = (zone as Record<string, unknown>).neighborhoods as
        | string[]
        | null
        | undefined;
      if (!zoneNeighborhoods || !Array.isArray(zoneNeighborhoods)) {
        return false;
      }
      return zoneNeighborhoods.some((n) => n.toLowerCase() === neighborhood.toLowerCase());
    });

    if (!matchingZone) {
      return NextResponse.json(
        { fee: null, error: "Não entregamos nesta região" },
        { status: 404 }
      );
    }

    return NextResponse.json({ fee: Number(matchingZone.fee) });
  } catch (error) {
    console.error("[DELIVERY ZONES GET]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
