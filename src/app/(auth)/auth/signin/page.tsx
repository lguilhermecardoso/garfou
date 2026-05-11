import { SignInForm } from "@/features/auth/signin-form";

interface Props {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function SignInPage({ searchParams }: Props) {
  const { callbackUrl = "/" } = await searchParams;
  return <SignInForm callbackUrl={callbackUrl} />;
}
