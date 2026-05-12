import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CouponForm } from "@/features/coupons/coupon-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Novo cupom" };

interface Props {
  params: Promise<{ restaurantId: string }>;
}

export default async function NewCouponPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { restaurantId } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <a
          href={`/dashboard/${restaurantId}/coupons`}
          className="text-sm text-neutral-400 transition-colors hover:text-neutral-700"
        >
          ← Cupons
        </a>
        <span className="text-neutral-200">/</span>
        <h1 className="text-2xl font-bold text-neutral-900">Novo cupom</h1>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <CouponForm restaurantId={restaurantId} />
      </div>
    </div>
  );
}
