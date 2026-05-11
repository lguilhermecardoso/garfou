import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/features/settings/settings-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Configurações" };

interface Props {
  params: Promise<{ restaurantId: string }>;
}

export default async function SettingsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { restaurantId } = await params;

  return <SettingsForm restaurantId={restaurantId} />;
}
