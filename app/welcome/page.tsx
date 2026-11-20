import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import Unlock from "./Unlock";

export const metadata = { title: "Welcome · Agent Desk" };
export const dynamic = "force-dynamic";

/** The moment after sign-in: the round photo and name, then the desk opens, like unlocking a Mac. */
export default async function Welcome({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login?error=AccessDenied");
  const { next } = await searchParams;
  const safe = next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/welcome") ? next : "/";
  return <Unlock name={user.name} photo={user.photo} next={safe} />;
}
