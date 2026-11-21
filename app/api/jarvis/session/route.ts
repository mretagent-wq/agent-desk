import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { JARVIS_MODEL, JARVIS_VOICE, jarvisInstructions, jarvisTools } from "@/lib/jarvis";

export const dynamic = "force-dynamic";

/**
 * Mints a short-lived OpenAI Realtime client secret for the signed-in person. The OPENAI_API_KEY
 * stays on the server; the browser only ever gets the ek_ secret, which expires in two minutes
 * (enough to start a call; the call itself can then run up to OpenAI's session limit).
 */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const key = cleanKey(process.env.OPENAI_API_KEY);
  if (!key) return NextResponse.json({ error: "Jarvis isn't connected yet. Add OPENAI_API_KEY in Netlify." }, { status: 503 });
  const shape = keyProblem(key);
  if (shape) return NextResponse.json({ error: `Couldn't start Jarvis: ${shape}` }, { status: 503 });

  const session = (withTranscript: boolean) => ({
    type: "realtime",
    model: JARVIS_MODEL,
    instructions: jarvisInstructions(user),
    output_modalities: ["audio"],
    audio: {
      input: {
        ...(withTranscript ? { transcription: { model: process.env.JARVIS_TRANSCRIBE_MODEL?.trim() || "gpt-live-transcribe", language: "en" } } : {}),
        turn_detection: { type: "semantic_vad" },
        noise_reduction: { type: "near_field" },
      },
      output: { voice: JARVIS_VOICE },
    },
    tools: jarvisTools(user),
    tool_choice: "auto",
  });
  const mint = (withTranscript: boolean) =>
    fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ expires_after: { anchor: "created_at", seconds: 120 }, session: session(withTranscript) }),
    }).catch((e: unknown) => ({ ok: false, status: 502, json: async () => ({ error: { message: e instanceof Error ? e.message : "network error" } }) }) as unknown as Response);

  let res = await mint(true);
  // If OpenAI rejects the transcription model, start without on-screen captions of what you said rather than fail.
  if (res.status === 400) res = await mint(false);

  const body = (await res.json().catch(() => ({}))) as { value?: string; expires_at?: number; error?: { message?: string } };
  if (!res.ok || !body.value) {
    const msg = body.error?.message ?? `OpenAI answered ${res.status}`;
    return NextResponse.json({ error: `Couldn't start Jarvis: ${msg}` }, { status: 502 });
  }
  return NextResponse.json({ secret: body.value, expiresAt: body.expires_at ?? null, model: JARVIS_MODEL }, { headers: { "Cache-Control": "no-store" } });
}

/** Tolerates the usual paste slips: spaces, line breaks, wrapping quotes, a leading "Bearer". */
function cleanKey(raw: string | undefined): string {
  let k = (raw ?? "").trim();
  k = k.replace(/^["'\u201c\u201d\u2018\u2019]+|["'\u201c\u201d\u2018\u2019]+$/g, "").trim();
  k = k.replace(/^bearer\s+/i, "").trim();
  k = k.replace(/^OPENAI_API_KEY\s*=\s*/i, "").trim();
  return k.replace(/\s+/g, "");
}

/** Describes what's wrong with the key's shape, never any of its characters. */
function keyProblem(k: string): string | null {
  if (k.startsWith("sk-")) return null;
  if (k.split(".").length === 3) {
    return "the OPENAI_API_KEY in Netlify is a sign-in token, not an API key. Create a secret key at platform.openai.com under API keys (it starts with sk-) and paste that instead.";
  }
  return "the OPENAI_API_KEY in Netlify isn't an OpenAI secret key. It should start with sk- and come from platform.openai.com under API keys.";
}
