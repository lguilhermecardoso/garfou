import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { skipCSRFCheck } from "@auth/core";
import { prisma } from "@/lib/db";
import { compare } from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/lib/auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  skipCSRFCheck,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        try {
          const parsed = credentialsSchema.safeParse(credentials);
          if (!parsed.success) {
            console.error("[auth] credentials validation failed:", parsed.error.flatten());
            return null;
          }

          const { email, password } = parsed.data;

          const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, email: true, image: true, passwordHash: true },
          });

          if (!user || !user.passwordHash) {
            console.error("[auth] user not found or no password:", email);
            return null;
          }

          const isValid = await compare(password, user.passwordHash);
          if (!isValid) {
            console.error("[auth] invalid password for:", email);
            return null;
          }

          return { id: user.id, name: user.name, email: user.email, image: user.image };
        } catch (err) {
          console.error("[auth] authorize exception:", err);
          return null;
        }
      },
    }),
  ],
});
