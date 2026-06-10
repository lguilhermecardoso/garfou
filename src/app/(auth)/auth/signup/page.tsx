"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput, CPFInput, CNPJInput, CEPInput } from "@/components/ui/masked-input";
import { Flame, User, Building2, ChevronRight, ChevronLeft } from "lucide-react";

type EntityType = "individual" | "company";

interface FormState {
  name: string;
  email: string;
  password: string;
  entityType: EntityType;
  cpf: string;
  cnpj: string;
  companyName: string;
  companyAddress: string;
  companyCEP: string;
  companyCity: string;
  companyState: string;
}

const INITIAL: FormState = {
  name: "",
  email: "",
  password: "",
  entityType: "individual",
  cpf: "",
  cnpj: "",
  companyName: "",
  companyAddress: "",
  companyCEP: "",
  companyCity: "",
  companyState: "",
};

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const totalSteps = form.entityType === "company" ? 3 : 2;

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (step < totalSteps) {
      setStep((s) => s + 1);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          cpf: form.entityType === "individual" ? form.cpf : undefined,
          cnpj: form.entityType === "company" ? form.cnpj : undefined,
          companyName: form.entityType === "company" ? form.companyName : undefined,
          companyAddress: form.entityType === "company" ? form.companyAddress : undefined,
          companyCEP: form.entityType === "company" ? form.companyCEP : undefined,
          companyCity: form.entityType === "company" ? form.companyCity : undefined,
          companyState: form.entityType === "company" ? form.companyState : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao criar conta.");
        return;
      }

      // Navigate to sign in — let user authenticate
      router.push(`/auth/signin?email=${encodeURIComponent(form.email)}&registered=1`);
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const step1Valid =
    form.name.trim().length >= 2 && form.email.includes("@") && form.password.length >= 8;
  const step2Valid =
    form.entityType === "individual"
      ? form.cpf.replace(/\D/g, "").length === 11
      : form.cnpj.replace(/\D/g, "").length === 14;
  const step3Valid =
    form.companyName.trim().length >= 2 &&
    form.companyAddress.trim().length >= 5 &&
    form.companyCEP.replace(/\D/g, "").length === 8;

  const canContinue = step === 1 ? step1Valid : step === 2 ? step2Valid : step3Valid;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="bg-primary-500 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl">
            <Flame className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Criar conta</h1>
          <p className="mt-1 text-sm text-neutral-500">Comece seu teste grátis</p>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? "bg-primary-500" : "bg-neutral-200"}`}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
          {/* Step 1 — Dados de acesso */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-neutral-800">Dados de acesso</h2>
              <Input
                label="Nome completo"
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                autoComplete="name"
                required
                placeholder="João Silva"
              />
              <Input
                label="Email"
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                autoComplete="email"
                required
                placeholder="voce@exemplo.com"
              />
              <Input
                label="Senha"
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                autoComplete="new-password"
                required
                placeholder="Mínimo 8 caracteres"
                minLength={8}
              />
            </div>
          )}

          {/* Step 2 — CPF ou CNPJ */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold text-neutral-800">Identificação</h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Usado para emissão do contrato digital de assinatura.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => update("entityType", "individual")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors ${
                    form.entityType === "individual"
                      ? "border-primary-400 bg-primary-50 text-primary-700"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  <User className="h-4 w-4" />
                  Pessoa física
                </button>
                <button
                  type="button"
                  onClick={() => update("entityType", "company")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors ${
                    form.entityType === "company"
                      ? "border-primary-400 bg-primary-50 text-primary-700"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  Empresa
                </button>
              </div>

              {form.entityType === "individual" ? (
                <CPFInput
                  label="CPF"
                  id="cpf"
                  value={form.cpf}
                  onChange={(e) => update("cpf", e.target.value)}
                  required
                />
              ) : (
                <CNPJInput
                  label="CNPJ"
                  id="cnpj"
                  value={form.cnpj}
                  onChange={(e) => update("cnpj", e.target.value)}
                  required
                />
              )}
            </div>
          )}

          {/* Step 3 — Dados da empresa (apenas empresa) */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold text-neutral-800">Dados da empresa</h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Necessários para o contrato digital de assinatura.
                </p>
              </div>
              <Input
                label="Razão social / Nome fantasia"
                id="companyName"
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                required
                placeholder="Exemplo Restaurantes Ltda"
              />
              <CEPInput
                label="CEP"
                id="companyCEP"
                value={form.companyCEP}
                onChange={(e) => update("companyCEP", e.target.value)}
                required
                onCEPComplete={async (cep) => {
                  try {
                    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                    const data = await res.json();
                    if (!data.erro) {
                      setForm((prev) => ({
                        ...prev,
                        companyAddress: data.logradouro
                          ? `${data.logradouro}, ${data.bairro ?? ""}`.trim().replace(/,$/, "")
                          : prev.companyAddress,
                        companyCity: data.localidade ?? prev.companyCity,
                        companyState: data.uf ?? prev.companyState,
                      }));
                    }
                  } catch {
                    // silently ignore
                  }
                }}
              />
              <Input
                label="Endereço completo"
                id="companyAddress"
                value={form.companyAddress}
                onChange={(e) => update("companyAddress", e.target.value)}
                required
                placeholder="Rua das Flores, 123 - Centro"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Cidade"
                  id="companyCity"
                  value={form.companyCity}
                  onChange={(e) => update("companyCity", e.target.value)}
                  required
                  placeholder="São Paulo"
                />
                <Input
                  label="Estado"
                  id="companyState"
                  value={form.companyState}
                  onChange={(e) => update("companyState", e.target.value.toUpperCase().slice(0, 2))}
                  required
                  placeholder="SP"
                  maxLength={2}
                />
              </div>
            </div>
          )}

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
                className="flex-none px-3"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={!canContinue} loading={loading}>
              {step < totalSteps ? (
                <>
                  Continuar
                  <ChevronRight className="ml-1.5 h-4 w-4" />
                </>
              ) : (
                "Criar conta grátis"
              )}
            </Button>
          </div>
        </form>

        <p className="text-center text-sm text-neutral-500">
          Já tem conta?{" "}
          <Link href="/auth/signin" className="text-primary-500 font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
