import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";

const auth = withAuth({ pages: { signIn: "/login" } });

export default function middleware(req: NextRequest, ev: NextFetchEvent) {
  const preview = process.env.PREVIEW_MODE === "1" && !process.env.VERCEL && !process.env.NETLIFY;
  if (preview) return NextResponse.next();
  // Until sign-in is configured, every page goes to /login, which lists what's missing.
  if (!process.env.NEXTAUTH_SECRET) return NextResponse.redirect(new URL("/login", req.url));
  return auth(req as NextRequestWithAuth, ev);
}

export const config = {
  matcher: ["/((?!login|api/auth|api/photo|api/remember|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
