import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createRestaurantSchema } from "@/lib/validations";
import { generateSlug } from "@/lib/utils";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createRestaurantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, phone, address, city, state } = parsed.data;

  try {
    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    let suffix = 0;
    while (await prisma.restaurant.findUnique({ where: { slug } })) {
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        slug,
        phone,
        address,
        city,
        state,
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
      },
    });

    return NextResponse.json({ data: restaurant }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/restaurants] erro:", message, err);
    return NextResponse.json(
      { error: "Erro ao criar restaurante", detail: message },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const restaurants = await prisma.restaurant.findMany({
      where: {
        deletedAt: null,
        members: { some: { userId: session.user.id } },
      },
      include: {
        members: {
          where: { userId: session.user.id },
          select: { role: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ data: restaurants });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/restaurants] erro:", message, err);
    return NextResponse.json(
      { error: "Erro ao buscar restaurantes", detail: message },
      { status: 500 }
    );
  }
}
