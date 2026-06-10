import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";
import { signUpSchema } from "@/lib/validations";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { z } from "zod";

const registerExtSchema = signUpSchema.extend({
  cpf: z.string().optional(),
  cnpj: z.string().optional(),
  companyName: z.string().optional(),
  companyAddress: z.string().optional(),
  companyCEP: z.string().optional(),
  companyCity: z.string().optional(),
  companyState: z.string().max(2).optional(),
});

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req);
  const rate = checkRateLimit({ key: `auth:register:${ip}`, limit: 10, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em instantes." },
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
  const parsed = registerExtSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const {
    name,
    email,
    password,
    cpf,
    cnpj,
    companyName,
    companyAddress,
    companyCEP,
    companyCity,
    companyState,
  } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Este email já está em uso." }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      ...(cpf ? { cpf } : {}),
      ...(cnpj ? { cnpj } : {}),
      ...(companyName ? { companyName } : {}),
      ...(companyAddress ? { companyAddress } : {}),
      ...(companyCEP ? { companyCEP } : {}),
      ...(companyCity ? { companyCity } : {}),
      ...(companyState ? { companyState } : {}),
    },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({ data: user }, { status: 201 });
}
