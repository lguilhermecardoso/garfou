import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/user/restaurants
 *
 * Returns all restaurants where the authenticated user is a member
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userRestaurants = await prisma.userRestaurant.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            isOpen: true,
          },
        },
        role: true,
      },
      orderBy: {
        restaurant: {
          name: "asc",
        },
      },
    });

    const restaurants = userRestaurants.map((ur) => ({
      id: ur.restaurant.id,
      name: ur.restaurant.name,
      slug: ur.restaurant.slug,
      logo: ur.restaurant.logo,
      isOpen: ur.restaurant.isOpen,
      role: ur.role,
    }));

    return NextResponse.json({ restaurants });
  } catch (error) {
    console.error("[GET /api/user/restaurants]", error);
    return NextResponse.json({ error: "Erro ao carregar restaurantes" }, { status: 500 });
  }
}
