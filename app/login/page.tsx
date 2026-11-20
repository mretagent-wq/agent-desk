import { cookies } from "next/headers";
import ProfileCircle from "@/components/ProfileCircle";
import { lookupUser, previewUser, type DeskUser } from "@/lib/auth";
import { isPreview } from "@/lib/mode";
import { readRemembered, REMEMBER_COOKIE } from "@/lib/photo";
import { missingEnv } from "@/lib/setup";
import LockClock from "./LockClock";
import LoginButton from "./LoginButton";

export const metadata = { title: "Sign in · Agent Desk" };

export const dynamic = "force-dynamic";

/** The person who last signed in on this browser, from a cookie only this app can sign. */
async function remembered(): Promise<DeskUser | null> {
  if (isPreview()) return process.env.PREVIEW_REMEMBER === "1" ? previewUser() : null;
  try {
    const email = readRemembered((await cookies()).get(REMEMBER_COOKIE)?.value);
    return email ? await lookupUser(email) : null;
  } catch {
    return null;
  }
}

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; callbackUrl?: string }> }) {
  const { error, callbackUrl } = await searchParams;
  const missing = missingEnv();
  const safeCallback = callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/";

  if (missing.length > 0) {
    return (
      <div className="login">
        <div className="glass">
          <div className="eyebrow">MRET 1 · Internal</div>
          <h1>Agent Desk</h1>
          <p>Almost there. Add these settings in Netlify (Project configuration, Environment variables), then redeploy.</p>
          <ul className="setup">
            {missing.map((m) => (
              <li key={m.name}><code>{m.name}</code><span>{m.what}</span></li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const who = error ? null : await remembered();
  const first = who?.name.split(/\s+/)[0] ?? "";
  return (
    <div className="login mac">
      <LockClock />
      <div className="mac-user">
        <ProfileCircle name={who?.name ?? "Agent Desk"} photo={who?.photo ?? null} mark={!who} size={132} />
        <div className="mac-name">{who ? who.name : "Agent Desk"}</div>
        <LoginButton callbackUrl={safeCallback} />
        {error ? (
          <div className="mac-note bad">{error === "AccessDenied" ? "That account isn't on the list." : "Sign-in didn't work. Try again."}</div>
        ) : who ? (
          <a className="mac-note link" href="/api/remember">Not {first}? Use another account</a>
        ) : (
          <div className="mac-note">Sign in with an approved Google account</div>
        )}
      </div>
      <div className="mac-foot">MRET 1 · Internal</div>
    </div>
  );
}
