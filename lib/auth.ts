import "server-only";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { isPreview } from "./mode";

export function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ profile }) {
      const p = profile as { email?: string; email_verified?: boolean } | undefined;
      const email = p?.email?.toLowerCase();
      if (!email || p?.email_verified === false) return false;
      return allowedEmails().includes(email);
    },
  },
};

/** Who is acting. Throws if nobody allowed is signed in. */
export async function requireUser(): Promise<{ email: string; name: string }> {
  if (isPreview()) return { email: "preview@local", name: "Preview" };
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email || !allowedEmails().includes(email)) throw new Error("Not signed in.");
  return { email, name: session?.user?.name ?? email };
}
