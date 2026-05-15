import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rateLimit";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.trim().toLowerCase();
        const ip = clientIpFromNextAuthRequest(req);
        const emailLimit = await consumeRateLimit({ key: `login:email:${email}`, capacity: 5, refillIntervalMs: 15 * 60 * 1000 });
        const ipLimit = await consumeRateLimit({ key: `login:ip:${ip}`, capacity: 20, refillIntervalMs: 15 * 60 * 1000 });
        if (!emailLimit.allowed || !ipLimit.allowed) return null;
        const user = await db.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        if (user.accountDeletedAt) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role, parentalConsentRequired: user.parentalConsentRequired, parentalConsentAt: user.parentalConsentAt } as any;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.parentalConsentRequired = (user as any).parentalConsentRequired;
        token.parentalConsentAt = (user as any).parentalConsentAt ? String((user as any).parentalConsentAt) : null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).parentalConsentRequired = token.parentalConsentRequired;
        (session.user as any).parentalConsentAt = token.parentalConsentAt;
      }
      return session;
    }
  },
  pages: { signIn: "/login" }
};

function clientIpFromNextAuthRequest(req: unknown) {
  const headers = (req as { headers?: Record<string, string | string[] | undefined> })?.headers || {};
  const forwarded = headers["x-forwarded-for"];
  const realIp = headers["x-real-ip"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded || (Array.isArray(realIp) ? realIp[0] : realIp);
  return String(value || "unknown").split(",")[0].trim() || "unknown";
}
