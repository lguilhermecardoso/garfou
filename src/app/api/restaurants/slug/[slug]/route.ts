/**
 * GET /api/restaurants/slug/:slug
 *
 * Get restaurant basic info by slug (public endpoint).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        isOpen: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurante não encontrado" }, { status: 404 });
    }

    return NextResponse.json(restaurant);
  } catch (error) {
    console.error("[Restaurant by slug API] Error:", error);
    return NextResponse.json({ error: "Erro ao buscar restaurante" }, { status: 500 });
  }
}
