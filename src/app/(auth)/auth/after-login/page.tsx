import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AfterLoginPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/auth/signin");
  }

  const membership = await prisma.userRestaurant.findFirst({
    where: { userId },
    select: { restaurantId: true },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) {
    redirect("/onboarding");
  }

  redirect(`/dashboard/${membership.restaurantId}`);
}
