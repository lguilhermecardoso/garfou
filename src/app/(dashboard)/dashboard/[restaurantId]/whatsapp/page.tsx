import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "WhatsApp Web" };

interface Props {
  params: Promise<{ restaurantId: string }>;
}

export default async function WhatsAppPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  await params; // ensure params resolved

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
        <div>
          <h1 className="font-bold text-neutral-900">WhatsApp Web</h1>
          <p className="text-xs text-neutral-500">Acesse suas conversas direto pelo sistema.</p>
        </div>
        <a
          href="https://web.whatsapp.com"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
        >
          Abrir em nova aba
        </a>
      </div>

      <div className="relative flex-1">
        {/* WhatsApp Web blocks iframes via X-Frame-Options — show fallback */}
        <iframe
          src="https://web.whatsapp.com"
          className="h-full w-full border-0"
          title="WhatsApp Web"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
        {/* Overlay message shown if iframe is blocked */}
        <noscript>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-neutral-50">
            <p className="text-sm text-neutral-500">
              O WhatsApp Web não permite incorporação. Acesse pelo botão acima.
            </p>
          </div>
        </noscript>
      </div>
    </div>
  );
}
