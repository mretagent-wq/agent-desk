import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { isPreview } from "@/lib/mode";
import { rememberValue, REMEMBER_COOKIE } from "@/lib/photo";

export const dynamic = "force-dynamic";

const opts = { httpOnly: true, sameSite: "lax" as const, path: "/", secure: !isPreview() };

/** Remembers who just signed in on this browser, so the sign-in screen can greet them by photo next time. */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  if (!isPreview()) res.cookies.set(REMEMBER_COOKIE, rememberValue(user.email), { ...opts, maxAge: 60 * 60 * 24 * 180 });
  return res;
}

/** "Not you?" on the sign-in screen: forget this browser's person and go back to the plain sign-in. */
export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  res.cookies.set(REMEMBER_COOKIE, "", { ...opts, maxAge: 0 });
  return res;
}
