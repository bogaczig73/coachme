import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import type { UserRole } from "@betri/db/schema";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole | null;
    } & import("next-auth").DefaultSession["user"];
  }

  interface User {
    role?: UserRole | null;
  }
}

export const authConfig = {
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        (token as Record<string, unknown>).id = user.id!;
        (token as Record<string, unknown>).role =
          (user as { role?: UserRole | null }).role ?? null;
      }
      if (trigger === "update" && session?.user?.role) {
        (token as Record<string, unknown>).role = session.user.role;
      }
      return token;
    },
    session({ session, token }) {
      const t = token as { id?: string; role?: UserRole | null };
      session.user.id = t.id ?? "";
      session.user.role = t.role ?? null;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
