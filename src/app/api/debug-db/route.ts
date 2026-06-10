import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const count = await prisma.user.count();
    const user = await prisma.user.findUnique({
      where: { email: "guilhermecardoso.info@gmail.com" },
      select: { id: true, email: true, passwordHash: true },
    });
    return NextResponse.json({
      ok: true,
      userCount: count,
      userFound: !!user,
      hasHash: !!user?.passwordHash,
      hashStart: user?.passwordHash?.slice(0, 10),
    });
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
