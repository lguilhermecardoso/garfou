"use server";

import { AuthError } from "next-auth";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { signIn, signOut } from "@/lib/auth";
import { signInSchema, signUpSchema } from "@/lib/validations";

export interface AuthActionState {
  error: string;
  email?: string;
  name?: string;
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function signInWithCredentialsAction(_prevState: AuthActionState, formData: FormData) {
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const callbackUrl = getString(formData, "callbackUrl") || "/auth/after-login";

  const parsed = signInSchema.safeParse({ email, password });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      email,
    } satisfies AuthActionState;
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return {
          error: "Email ou senha incorretos.",
          email: parsed.data.email,
        } satisfies AuthActionState;
      }

      return {
        error: "Erro ao fazer login. Tente novamente.",
        email: parsed.data.email,
      } satisfies AuthActionState;
    }

    throw error;
  }

  return { error: "" } satisfies AuthActionState;
}

export async function signInWithGoogleAction(formData: FormData) {
  const callbackUrl = getString(formData, "callbackUrl") || "/auth/after-login";
  await signIn("google", { redirectTo: callbackUrl });
}

export async function registerAndSignInAction(_prevState: AuthActionState, formData: FormData) {
  const name = getString(formData, "name");
  const email = getString(formData, "email");
  const password = getString(formData, "password");

  const parsed = signUpSchema.safeParse({ name, email, password });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      email,
      name,
    } satisfies AuthActionState;
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return {
      error: "Este email já está em uso.",
      email: parsed.data.email,
      name: parsed.data.name,
    } satisfies AuthActionState;
  }

  const passwordHash = await hash(parsed.data.password, 12);
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    },
    select: { id: true },
  });

  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: "/onboarding",
  });

  return { error: "" } satisfies AuthActionState;
}

export async function logoutAction() {
  await signOut({ redirectTo: "/auth/signin" });
}
