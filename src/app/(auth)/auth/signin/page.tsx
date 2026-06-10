import { SignInForm } from "@/features/auth/signin-form";

interface Props {
  searchParams: Promise<{ callbackUrl?: string; email?: string; registered?: string }>;
}

export default async function SignInPage({ searchParams }: Props) {
  const { callbackUrl = "/auth/after-login", email, registered } = await searchParams;
  return (
    <SignInForm
      callbackUrl={callbackUrl}
      prefillEmail={email}
      justRegistered={registered === "1"}
    />
  );
}
