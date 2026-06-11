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
        "/auth/signout",
        "/auth/after-login",
        "/auth/error",
        "/manifest.json",
        "/sw.js",
      ];
      const isPublic =
        publicPaths.includes(nextUrl.pathname) ||
        nextUrl.pathname.startsWith("/icons/") ||
        nextUrl.pathname.startsWith("/menu/") ||
        nextUrl.pathname.startsWith("/nps/") ||
        nextUrl.pathname.startsWith("/waiter-app/") ||
        nextUrl.pathname.startsWith("/kitchen-app/") ||
        nextUrl.pathname.startsWith("/api/auth") ||
        nextUrl.pathname.startsWith("/api/devices/") ||
        nextUrl.pathname.startsWith("/api/bff/") ||
        nextUrl.pathname.startsWith("/api/webhooks/") ||
        nextUrl.pathname.startsWith("/api/debug-db") ||
        /^\/api\/restaurants\/[^/]+\/payment-intent$/.test(nextUrl.pathname) ||
        /^\/api\/restaurants\/[^/]+\/checkout-session$/.test(nextUrl.pathname) ||
        /^\/api\/restaurants\/[^/]+\/menu$/.test(nextUrl.pathname) ||
        /^\/api\/restaurants\/[^/]+\/orders(\/[^/]+)?$/.test(nextUrl.pathname) ||
        /^\/api\/restaurants\/[^/]+\/delivery-zones/.test(nextUrl.pathname);

      if (isPublic) return true;
      if (!isLoggedIn) return false;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token?.id) session.user.id = token.id as string;
        session.user.isAdmin = (token?.isAdmin as boolean) ?? false;
      }
      return session;
    },
  },
};
