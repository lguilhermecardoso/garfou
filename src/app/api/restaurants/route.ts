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

  const { name, phone, address, city, state, logo } = parsed.data;

  try {
    // Verificar se o usuário existe no banco
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true },
    });

    if (!userExists) {
      console.error(
        "[POST /api/restaurants] usuário da sessão não existe no banco:",
        session.user.id
      );
      return NextResponse.json(
        {
          error: "Erro de autenticação",
          detail: "Usuário não encontrado. Tente fazer login novamente.",
          code: "USER_NOT_FOUND",
          action: "LOGOUT",
        },
        { status: 401 }
      );
    }

    console.log("[POST /api/restaurants] criando restaurante para usuário:", userExists.email);

    // Verificar quantos restaurantes o usuário já possui
    const restaurantCount = await prisma.userRestaurant.count({
      where: { userId: session.user.id },
    });

    // Verificar plano do usuário (busca o primeiro restaurante dele para pegar o plano)
    let userPlan = "STARTER"; // padrão
    if (restaurantCount > 0) {
      const firstRestaurant = await prisma.userRestaurant.findFirst({
        where: { userId: session.user.id },
        include: {
          restaurant: {
            select: {
              subscriptionStatus: true,
              settings: true,
            },
          },
        },
      });

      // Extrai o plano das settings do primeiro restaurante
      const settings = firstRestaurant?.restaurant?.settings as { plan?: string } | undefined;
      userPlan = settings?.plan || "STARTER";
    }

    // Validar limite de restaurantes baseado no plano
    if (restaurantCount >= 1 && userPlan !== "ENTERPRISE") {
      console.log("[POST /api/restaurants] limite de restaurantes atingido para plano:", userPlan);
      return NextResponse.json(
        {
          error: "Limite de restaurantes atingido",
          detail: `Seu plano ${userPlan} permite apenas 1 restaurante. Faça upgrade para o plano Enterprise para gerenciar múltiplos restaurantes.`,
          requiredPlan: "ENTERPRISE",
          currentPlan: userPlan,
        },
        { status: 403 }
      );
    }

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
        ...(logo ? { logo } : {}),
        settings: {
          plan: userPlan, // Herda o plano do primeiro restaurante, ou STARTER se for o primeiro
        },
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
      },
    });

    console.log("[POST /api/restaurants] restaurante criado com sucesso:", restaurant.id);
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
