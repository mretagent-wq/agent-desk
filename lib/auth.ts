import "server-only";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { USERS } from "./config";
import { isPreview } from "./mode";
import * as n8n from "./n8n";
import { photoKey, photoKeyForEmail, photoSrc } from "./photo";

export type Role = "admin" | "member";
export interface DeskUser { email: string; name: string; title: string; role: Role; photo: string | null; photoKey: string | null }

function emails(v: string | undefined): string[] {
  return (v ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}
/** Google accounts allowed in as members (Netlify setting). */
export function allowedEmails(): string[] { return emails(process.env.ALLOWED_EMAILS); }
/** Google accounts with admin rights (Netlify setting). The only source of admin. */
export function adminEmails(): string[] { return emails(process.env.ADMIN_EMAILS); }

/* The desk_users roster, read from n8n and kept for a minute per server instance. */
let cache: { at: number; rows: n8n.Row[] } | null = null;
async function roster(): Promise<n8n.Row[]> {
  if (!n8n.n8nConfigured()) return [];
  if (cache && Date.now() - cache.at < 60_000) return cache.rows;
  try {
    const rows = await n8n.listRows(USERS.tableId, 500);
    cache = { at: Date.now(), rows };
    return rows;
  } catch {
    return cache?.rows ?? [];
  }
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** The person behind an email, or null when that account isn't allowed in. */
export async function lookupUser(email: string, fallbackName = ""): Promise<DeskUser | null> {
  const e = email.trim().toLowerCase();
  if (!e) return null;
  const row = (await roster()).find((r) => str(r.email).toLowerCase() === e);
  const rowActive = row ? row.active !== false && row.active !== "false" : false;
  const admin = adminEmails().includes(e);
  if (!admin && !rowActive && !allowedEmails().includes(e)) return null;
  let photo = str(row?.photo_url);
  if (!photoKey(photo) && !photo.startsWith("https://")) {
    const k = await photoKeyForEmail(e);
    if (k) photo = `desk:${k}`;
  }
  return {
    email: e,
    name: str(row?.name) || fallbackName || e,
    title: str(row?.title),
    role: admin ? "admin" : "member",
    photo: photoSrc(photo),
    photoKey: photoKey(photo),
  };
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
      return (await lookupUser(email)) !== null;
    },
  },
};

const PREVIEW_USER: DeskUser = {
  email: "preview@local",
  name: process.env.PREVIEW_NAME || "Preview",
  title: "Local preview",
  role: "admin",
  photo: process.env.PREVIEW_PHOTO_FILE ? "/api/photo/preview" : null,
  photoKey: process.env.PREVIEW_PHOTO_FILE ? "preview" : null,
};
export function previewUser(): DeskUser { return PREVIEW_USER; }

/** Who is signed in right now, checked against the current lists. Null when nobody allowed is. */
export async function currentUser(): Promise<DeskUser | null> {
  if (isPreview()) return PREVIEW_USER;
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;
  return lookupUser(email, session?.user?.name ?? "");
}

/** Who is acting. Throws if nobody allowed is signed in. */
export async function requireUser(): Promise<DeskUser> {
  const u = await currentUser();
  if (!u) throw new Error("Not signed in.");
  return u;
}

/** Same, for admin-only actions. */
export async function requireAdmin(): Promise<DeskUser> {
  const u = await requireUser();
  if (u.role !== "admin") throw new Error("Not allowed.");
  return u;
}
