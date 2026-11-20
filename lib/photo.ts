import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { DESK_PHOTOS } from "./config";
import { isPreview } from "./mode";
import * as n8n from "./n8n";

/** Where the browser loads a roster photo_url from: "desk:<key>" is served by this app, an https link as is. */
export function photoSrc(raw: string): string | null {
  const v = raw.trim();
  const m = /^desk:([a-z0-9_-]{1,40})$/i.exec(v);
  if (m) return `/api/photo/${m[1]}`;
  return v.startsWith("https://") ? v : null;
}

/** The desk_photos key behind a roster photo_url, if it points at one. */
export function photoKey(raw: string): string | null {
  const m = /^desk:([a-z0-9_-]{1,40})$/i.exec(raw.trim());
  return m ? m[1] : null;
}

/* ---------- the photo itself ---------- */

let cache: { at: number; rows: n8n.Row[] } | null = null;

export async function loadPhoto(key: string): Promise<{ mime: string; bytes: Buffer } | null> {
  if (isPreview()) {
    const file = process.env.PREVIEW_PHOTO_FILE;
    if (key !== "preview" || !file) return null;
    return { mime: "image/jpeg", bytes: await readFile(file) };
  }
  if (!n8n.n8nConfigured()) return null;
  if (!cache || Date.now() - cache.at > 5 * 60_000) cache = { at: Date.now(), rows: await n8n.listRows(DESK_PHOTOS.tableId, 200) };
  const row = cache.rows.find((r) => r.photo_key === key);
  const data = typeof row?.data_b64 === "string" ? row.data_b64 : "";
  const mime = typeof row?.mime === "string" && /^image\/(jpeg|png|webp)$/.test(row.mime) ? row.mime : "";
  if (!data || !mime) return null;
  return { mime, bytes: Buffer.from(data, "base64") };
}

/* ---------- "remember me" for the sign-in screen, like the last user on a Mac ---------- */

export const REMEMBER_COOKIE = "desk_who";

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is not set.");
  return s;
}
const sign = (body: string) => createHmac("sha256", secret()).update(`desk-who:${body}`).digest("base64url");

/** A signed value naming the person who last signed in on this browser. */
export function rememberValue(email: string): string {
  const body = Buffer.from(email.toLowerCase(), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

/** The email in a remember cookie, or null if it is missing or was not made by this app. */
export function readRemembered(value: string | undefined): string | null {
  if (!value) return null;
  const [body, mac] = value.split(".");
  if (!body || !mac) return null;
  try {
    const want = Buffer.from(sign(body));
    const got = Buffer.from(mac);
    if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
    return Buffer.from(body, "base64url").toString("utf8");
  } catch {
    return null;
  }
}
