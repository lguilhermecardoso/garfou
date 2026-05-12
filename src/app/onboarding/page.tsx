"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UtensilsCrossed, ArrowRight, MapPin, Phone } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingRestaurants, setCheckingRestaurants] = useState(true);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
  });

  // Verifica se usuário já tem restaurantes e redireciona
  useEffect(() => {
    async function checkExistingRestaurants() {
      try {
        const res = await fetch("/api/user/restaurants");
        if (res.ok) {
          const data = await res.json();
          if (data.restaurants && data.restaurants.length > 0) {
            // Usuário já tem restaurante, redireciona para o primeiro
            router.push(`/dashboard/${data.restaurants[0].id}`);
            return;
          }
        }
      } catch (error) {
        console.error("Erro ao verificar restaurantes:", error);
      } finally {
        setCheckingRestaurants(false);
      }
    }

    checkExistingRestaurants();
  }, [router]);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Mostra loading enquanto verifica restaurantes existentes
  if (checkingRestaurants) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="border-primary-200 border-t-primary-600 mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4" />
          <p className="text-sm text-neutral-600">Verificando configuração...</p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) {
      if (!form.name.trim()) return;
      setStep(2);
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        // Se o usuário não existe no banco, fazer logout automático
        if (data.code === "USER_NOT_FOUND") {
          router.push("/auth/signout");
          return;
        }

        // Se atingiu limite de restaurantes, mostrar mensagem específica
        if (res.status === 403 && data.requiredPlan) {
          setError(
            `${data.error}\n\n` +
              `Plano atual: ${data.currentPlan}\n` +
              `Plano necessário: ${data.requiredPlan}\n\n` +
              `Faça upgrade nas configurações de cobrança do seu restaurante.`
          );
          return;
        }

        setError(data.error ?? "Erro ao criar restaurante.");
        return;
      }
      router.push(`/dashboard/${data.data.id}`);
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-100 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="bg-primary-500 flex h-10 w-10 items-center justify-center rounded-2xl">
            <UtensilsCrossed className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <span className="text-lg font-bold text-neutral-900">GARFOU</span>
            <p className="text-xs text-neutral-500">Configure seu restaurante</p>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="border-b border-neutral-100 bg-white px-4 py-2">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 flex-1 rounded-full ${step >= 1 ? "bg-primary-500" : "bg-neutral-200"}`}
            />
            <div
              className={`h-2 flex-1 rounded-full ${step >= 2 ? "bg-primary-500" : "bg-neutral-200"}`}
            />
          </div>
          <p className="mt-1 text-xs text-neutral-400">Passo {step} de 2</p>
        </div>
      </div>

      <main className="flex-1 px-4 py-8" id="main-content">
        <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-6">
          {step === 1 && (
            <>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">
                  Como se chama seu restaurante?
                </h1>
                <p className="mt-1 text-neutral-500">
                  Você pode alterar isso depois nas configurações.
                </p>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <Input
                  label="Nome do restaurante"
                  id="name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Ex: Pizzaria do João"
                  autoFocus
                  required
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={!form.name.trim()}>
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">Informações de contato</h1>
                <p className="mt-1 text-neutral-500">Opcional — você pode preencher depois.</p>
              </div>

              <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <Phone className="mt-7 h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                  <div className="flex-1">
                    <Input
                      label="Telefone / WhatsApp"
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="mt-7 h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                  <div className="flex-1 space-y-3">
                    <Input
                      label="Endereço"
                      id="address"
                      value={form.address}
                      onChange={(e) => update("address", e.target.value)}
                      placeholder="Rua, número"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Cidade"
                        id="city"
                        value={form.city}
                        onChange={(e) => update("city", e.target.value)}
                        placeholder="São Paulo"
                      />
                      <Input
                        label="Estado"
                        id="state"
                        value={form.state}
                        onChange={(e) => update("state", e.target.value.toUpperCase().slice(0, 2))}
                        placeholder="SP"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <p className="bg-error-light text-error-dark rounded-xl px-4 py-3 text-sm">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                >
                  Voltar
                </Button>
                <Button type="submit" className="flex-1" size="lg" loading={loading}>
                  Criar restaurante
                </Button>
              </div>
            </>
          )}
        </form>
      </main>
    </div>
  );
}
