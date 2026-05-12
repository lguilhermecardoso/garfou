"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";

export function NewRestaurantButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCreateRestaurant() {
    setLoading(true);

    try {
      // Navega para página de criação de novo restaurante
      router.push("/restaurants/new");
    } catch {
      // Erro ao navegar - silenciosamente falha
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCreateRestaurant}
      disabled={loading}
      className="text-primary-600 hover:bg-primary-50 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
    >
      <Building2 className="h-4 w-4" aria-hidden="true" />
      <span>{loading ? "Carregando..." : "Cadastrar Nova Unidade"}</span>
    </button>
  );
}
