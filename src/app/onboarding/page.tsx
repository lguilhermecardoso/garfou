"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UtensilsCrossed, ArrowRight, MapPin, Phone } from "lucide-react";

export default function OnboardingPage() {
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
      <header className="bg-white border-b border-neutral-100 px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-500">
            <UtensilsCrossed className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <span className="text-lg font-bold text-neutral-900">GARFOU</span>
            <p className="text-xs text-neutral-500">Configure seu restaurante</p>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="bg-white border-b border-neutral-100 px-4 py-2">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-2">
            <div className={`h-2 flex-1 rounded-full ${step >= 1 ? "bg-primary-500" : "bg-neutral-200"}`} />
            <div className={`h-2 flex-1 rounded-full ${step >= 2 ? "bg-primary-500" : "bg-neutral-200"}`} />
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

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={!form.name.trim()}
              >
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">
                  Informações de contato
                </h1>
                <p className="mt-1 text-neutral-500">
                  Opcional — você pode preencher depois.
                </p>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-start gap-3">
                  <Phone className="mt-7 h-4 w-4 text-neutral-400 shrink-0" aria-hidden="true" />
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
                  <MapPin className="mt-7 h-4 w-4 text-neutral-400 shrink-0" aria-hidden="true" />
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
                <p className="rounded-xl bg-error-light px-4 py-3 text-sm text-error-dark">
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
                <Button
                  type="submit"
                  className="flex-1"
                  size="lg"
                  loading={loading}
                >
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
