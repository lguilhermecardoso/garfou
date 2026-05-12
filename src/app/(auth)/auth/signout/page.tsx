"use client";

import { useEffect } from "react";
import { logoutAction } from "@/features/auth/actions";
import { UtensilsCrossed } from "lucide-react";

export default function SignOutPage() {
  useEffect(() => {
    // Executar logout automaticamente ao carregar a página
    logoutAction();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="bg-primary-500 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl">
          <UtensilsCrossed className="h-6 w-6 text-white" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900">Saindo...</h1>
        <p className="text-sm text-neutral-500">
          Você está sendo desconectado. Aguarde um momento.
        </p>
      </div>
    </div>
  );
}
