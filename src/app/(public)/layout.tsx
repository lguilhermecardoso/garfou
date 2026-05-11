import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GARFOU — Sistema para Restaurantes",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
