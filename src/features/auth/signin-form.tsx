"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UtensilsCrossed } from "lucide-react";
import { signInWithCredentialsAction, signInWithGoogleAction } from "@/features/auth/actions";

interface Props {
  callbackUrl: string;
}

function SubmitButton({ children, ...props }: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();

  return (
    <Button {...props} loading={pending}>
      {children}
    </Button>
  );
}

export function SignInForm({ callbackUrl }: Props) {
  const [state, formAction] = useActionState(signInWithCredentialsAction, { error: "" });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="bg-primary-500 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl">
            <UtensilsCrossed className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Entrar no GARFOU</h1>
          <p className="mt-1 text-sm text-neutral-500">Faça login na sua conta</p>
        </div>

        <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
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
              autoComplete="current-password"
              required
              placeholder="••••••••"
              error={state.error}
            />
            <SubmitButton type="submit" className="w-full">
              Entrar
            </SubmitButton>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-neutral-400">ou</span>
            </div>
          </div>

          <form action={signInWithGoogleAction}>
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <SubmitButton type="submit" variant="outline" className="w-full">
              Continuar com Google
            </SubmitButton>
          </form>
        </div>

        <p className="text-center text-sm text-neutral-500">
          Não tem conta?{" "}
          <Link href="/auth/signup" className="text-primary-500 font-medium hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
