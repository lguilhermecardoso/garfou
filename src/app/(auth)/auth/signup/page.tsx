"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UtensilsCrossed } from "lucide-react";
import { registerAndSignInAction } from "@/features/auth/actions";

function SubmitButton({ children, ...props }: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();

  return (
    <Button {...props} loading={pending}>
      {children}
    </Button>
  );
}

export default function SignUpPage() {
  const [state, formAction] = useActionState(registerAndSignInAction, { error: "" });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="bg-primary-500 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl">
            <UtensilsCrossed className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Criar conta</h1>
          <p className="mt-1 text-sm text-neutral-500">Comece seu teste grátis</p>
        </div>

        <form action={formAction} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
          <Input
            label="Nome completo"
            id="name"
            name="name"
            type="text"
            defaultValue={state.name ?? ""}
            autoComplete="name"
            required
            placeholder="João Silva"
          />
          <Input
            label="Email"
            id="email"
            name="email"
            type="email"
            defaultValue={state.email ?? ""}
            autoComplete="email"
            required
            placeholder="voce@exemplo.com"
          />
          <Input
            label="Senha"
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="Mínimo 8 caracteres"
            minLength={8}
            error={state.error}
          />
          <SubmitButton type="submit" className="w-full">
            Criar conta grátis
          </SubmitButton>
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
