import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

const schema = z.object({
  score: z.number().int().min(0).max(10),
  comment: z.string().max(500).optional(),
  orderId: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const { restaurantId } = await params;

  const ip = getRequestIp(req);
  const rate = checkRateLimit({ key: `nps:${restaurantId}:${ip}`, limit: 20, windowMs: 600_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde para enviar nova avaliacao." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSeconds),
          "X-RateLimit-Remaining": String(rate.remaining),
        },
      }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { score, comment, orderId } = parsed.data;

  const nps = await prisma.npsResponse.create({
    data: {
      restaurantId,
      score,
      comment,
      orderId,
    },
  });

  return NextResponse.json({ data: nps }, { status: 201 });
}
