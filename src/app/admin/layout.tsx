import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Flame } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Admin access requires isAdmin=true — set directly in the database
  if (!session?.user?.isAdmin) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Flame className="h-6 w-6 text-red-500" aria-hidden="true" />
          <span className="text-lg font-bold text-neutral-900">chamou.delivery</span>
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
            ADMIN
          </span>
          <span className="ml-auto text-sm text-neutral-500">{session.user.email}</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
