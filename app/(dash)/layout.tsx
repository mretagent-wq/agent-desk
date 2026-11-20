import { getServerSession } from "next-auth";
import Sidebar from "@/components/Sidebar";
import { authOptions } from "@/lib/auth";
import { ago } from "@/lib/format";
import { snapshot } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const s = await snapshot();
  const preview = s.mode === "preview";
  const session = preview ? null : await getServerSession(authOptions);
  const who = preview ? "Nicholas & Dan" : session?.user?.name ?? session?.user?.email ?? "";
  return (
    <div className="shell">
      <Sidebar pending={s.approvals.length} who={who} preview={preview} />
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
