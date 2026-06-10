"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UtensilsCrossed, ArrowRight, MapPin, Phone, AlertCircle } from "lucide-react";

export default function NewRestaurantPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
  });

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data.error === "PLAN_LIMIT_REACHED") {
          setError(
            `Seu plano ${data.currentPlan} permite apenas 1 restaurante. Para criar múltiplos restaurantes, faça upgrade para o plano ${data.requiredPlan}.`
          );
        } else {
          setError(data.error || "Erro ao criar restaurante");
        }
        setLoading(false);
        return;
      }

      // Sucesso! Redireciona para o novo restaurante
      router.push(`/dashboard/${data.restaurantId}`);
    } catch {
      setError("Erro ao conectar com o servidor");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="bg-primary-100 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <UtensilsCrossed className="text-primary-600 h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Criar Nova Unidade</h1>
          <p className="mt-2 text-sm text-neutral-600">Adicione um novo restaurante à sua conta</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Erro</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-2 w-16 rounded-full transition-colors ${
                s <= step ? "bg-primary-600" : "bg-neutral-200"
              }`}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Dados Básicos */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  Nome do Restaurante
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Ex: Bistrô Centro - Shopping Iguatemi"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  <Phone className="mr-1 inline h-4 w-4" />
                  Telefone
                </label>
                <Input
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+55 11 91234-5678"
                  type="tel"
                  required
                />
              </div>

              <Button
                type="button"
                onClick={() => setStep(2)}
                disabled={!form.name.trim() || !form.phone.trim()}
                className="w-full"
              >
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Endereço */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  <MapPin className="mr-1 inline h-4 w-4" />
                  Endereço
                </label>
                <Input
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="Rua, número, bairro"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">Cidade</label>
                  <Input
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    placeholder="São Paulo"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">Estado</label>
                  <Input
                    value={form.state}
                    onChange={(e) => update("state", e.target.value.toUpperCase())}
                    placeholder="SP"
                    maxLength={2}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                  disabled={loading}
                >
                  Voltar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    loading || !form.address.trim() || !form.city.trim() || !form.state.trim()
                  }
                  className="flex-1"
                >
                  {loading ? "Criando..." : "Criar Restaurante"}
                </Button>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
