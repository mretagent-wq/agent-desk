import { cookies } from "next/headers";
import { currentUser, lookupUser } from "@/lib/auth";
import { loadPhoto, readRemembered, REMEMBER_COOKIE } from "@/lib/photo";

export const dynamic = "force-dynamic";

/**
 * A profile photo from desk_photos. Signed-in people can load any team photo. On the sign-in screen,
 * the person this browser remembers (a cookie this app signed after their last sign-in) can load their own.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  let allowed = Boolean(await currentUser());
  if (!allowed) {
    const email = readRemembered((await cookies()).get(REMEMBER_COOKIE)?.value);
    const who = email ? await lookupUser(email) : null;
    allowed = Boolean(who && who.photoKey === key);
  }
  if (!allowed) return new Response("Not found", { status: 404 });
  const photo = await loadPhoto(key).catch(() => null);
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(photo.bytes), {
    headers: { "Content-Type": photo.mime, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
