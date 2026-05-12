/**
 * Edge-compatible auth config — sem Prisma adapter.
 * Usado apenas no proxy (edge runtime) para verificar sessão JWT.
 */
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const publicPaths = [
        "/",
        "/auth/signin",
        "/auth/signup",
        "/auth/error",
        "/manifest.json",
        "/sw.js",
      ];
      const isPublic =
        publicPaths.includes(nextUrl.pathname) ||
        nextUrl.pathname.startsWith("/icons/") ||
        nextUrl.pathname.startsWith("/menu/") ||
        nextUrl.pathname.startsWith("/nps/") ||
        nextUrl.pathname.startsWith("/api/auth");

      if (isPublic) return true;
      if (!isLoggedIn) return false;
      return true;
    },
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
