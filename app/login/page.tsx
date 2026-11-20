import { missingEnv } from "@/lib/setup";
import LoginButton from "./LoginButton";

export const metadata = { title: "Sign in · Agent Desk" };

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; callbackUrl?: string }> }) {
  const { error, callbackUrl } = await searchParams;
  const missing = missingEnv();
  const safeCallback = callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/";
  return (
    <div className="login">
      <div className="glass">
        <div className="eyebrow">MRET 1 · Internal</div>
        <h1>Agent Desk</h1>
        {missing.length > 0 ? (
          <>
            <p>Almost there. Add these settings in Netlify (Project configuration, Environment variables), then redeploy.</p>
            <ul className="setup">
              {missing.map((m) => (
                <li key={m.name}><code>{m.name}</code><span>{m.what}</span></li>
              ))}
            </ul>
          </>
        ) : (
          <p>Sign in with an approved Google account.</p>
        )}
        {error && (
          <div className="banner glass bad" style={{ marginBottom: 18, textAlign: "left" }}>
            <span className="dot bad" />
            <span>{error === "AccessDenied" ? "That account isn't on the list." : "Sign-in didn't work. Try again."}</span>
          </div>
        )}
        {missing.length === 0 && <LoginButton callbackUrl={safeCallback} />}
      </div>
    </div>
  );
}
