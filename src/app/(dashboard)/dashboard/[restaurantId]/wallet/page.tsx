import { requireRole } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { WalletClient } from "@/features/wallet/wallet-client";

interface Props {
  params: Promise<{ restaurantId: string }>;
}

export default async function WalletPage({ params }: Props) {
  const { restaurantId } = await params;
  const access = await requireRole(restaurantId, "MANAGER");
  if ("error" in access) redirect(`/dashboard/${restaurantId}`);

  return <WalletClient restaurantId={restaurantId} />;
}
