import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { currentUser } from "@/lib/auth";
import { ago } from "@/lib/format";
import { snapshot } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  // Checked on every page against the current lists, so taking someone off locks them out right away.
  const user = await currentUser();
  if (!user) redirect("/login?error=AccessDenied");
  const s = await snapshot();
  const preview = s.mode === "preview";
  return (
    <div className="shell">
      <Sidebar pending={s.approvals.length} who={user.name} title={user.title} admin={user.role === "admin"} preview={preview} photo={user.photo} />
      <main className="main">
        {preview && (
          <div className="banner glass warn">
            <span className="dot warn" />
            <span>
              <b>Preview.</b> Showing a snapshot of your n8n read {ago(s.takenAt, Date.now())}. Buttons work on the snapshot only and change nothing in n8n.
            </span>
          </div>
        )}
        {s.errors.map((e) => (
          <div key={e} className="banner glass bad"><span className="dot bad" /><span>{e}</span></div>
        ))}
        {children}
        <div className="muted small" style={{ padding: "0 4px" }}>
          {preview ? "Snapshot" : "Live"} · read {ago(s.takenAt, Date.now())}
        </div>
      </main>
    </div>
  );
}
