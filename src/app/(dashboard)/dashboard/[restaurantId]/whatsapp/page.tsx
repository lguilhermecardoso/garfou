import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { WhatsAppTools } from "@/features/whatsapp/whatsapp-tools";

export const metadata: Metadata = { title: "WhatsApp" };

interface Props {
  params: Promise<{ restaurantId: string }>;
}

export default async function WhatsAppPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  await params;

  return <WhatsAppTools />;
}
