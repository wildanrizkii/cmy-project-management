import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user || !user.password) return null;

        const passwordMatch = await bcrypt.compare(
          parsed.data.password,
          user.password
        );
        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For Google login, validate email exists in users table
      if (account?.provider === "google") {
        if (!user.email) return false;
        const existing = await db.user.findUnique({
          where: { email: user.email },
        });
        if (!existing) {
          return "/login?error=not_registered";
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // For credentials login, user object has all fields
        if (account?.provider === "credentials") {
          token.id = user.id;
          token.role = (user as { role?: string }).role;
          token.department = (user as { department?: string }).department;
          token.name = user.name;
        }

        // For Google login, fetch from DB
        if (account?.provider === "google" && user.email) {
          const dbUser = await db.user.findUnique({
            where: { email: user.email },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.department = dbUser.department ?? undefined;
            token.name = dbUser.name;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.department = token.department as string | undefined;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
});
