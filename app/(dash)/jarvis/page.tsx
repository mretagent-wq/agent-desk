import Jarvis from "@/components/Jarvis";
import { requireUser } from "@/lib/auth";
import { JARVIS_MODEL } from "@/lib/jarvis";

export const dynamic = "force-dynamic";

export default async function JarvisPage() {
  const user = await requireUser();
  const ready = Boolean(process.env.OPENAI_API_KEY);
  return (
    <>
      <header className="top">
        <div>
          <div className="eyebrow">Voice</div>
          <h1>Jarvis</h1>
          <p>Talk to the desk. Jarvis checks workflows, runs, approvals, the team, to-dos and the content plan live, and tells you what&apos;s going on.</p>
        </div>
      </header>
      {!ready && (
        <div className="banner glass warn">
          <span className="dot warn" />
          <span>
            <b>One setting left.</b> {user.role === "admin" ? "Add OPENAI_API_KEY in Netlify (Project configuration, Environment variables), then redeploy." : "Nicholas needs to add the OpenAI key before Jarvis can talk."}
          </span>
        </div>
      )}
      <Jarvis first={user.name.split(" ")[0] || "there"} ready={ready} />
      <div className="muted small" style={{ padding: "0 4px" }}>Voice by OpenAI {JARVIS_MODEL}. Audio goes to OpenAI for the call; nothing is recorded on the desk.</div>
    </>
  );
}
