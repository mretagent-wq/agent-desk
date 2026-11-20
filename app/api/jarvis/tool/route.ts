import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { runJarvisTool } from "@/lib/jarvis";

export const dynamic = "force-dynamic";

/** Runs one of Jarvis's read-only tools for the signed-in person and returns JSON for the model. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  let name = "";
  let args: Record<string, unknown> = {};
  try {
    const b = (await req.json()) as { name?: unknown; args?: unknown };
    name = typeof b.name === "string" ? b.name.slice(0, 60) : "";
    if (typeof b.args === "string") args = JSON.parse(b.args || "{}");
    else if (b.args && typeof b.args === "object") args = b.args as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  try {
    const result = await runJarvisTool(user, name, args);
    return NextResponse.json({ result }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ result: { error: e instanceof Error ? e.message : "The read failed." } });
  }
}
