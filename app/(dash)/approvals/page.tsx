import { ApprovalActions } from "@/components/Controls";
import { APPROVAL_SOURCES } from "@/lib/config";
import { ago } from "@/lib/format";
import { nowFor, snapshot } from "@/lib/view";

export default async function Approvals() {
  const s = await snapshot();
  const now = nowFor(s);

  return (
    <>
      <header className="top">
        <div>
          <div className="eyebrow">Human in the loop</div>
          <h1>Approvals</h1>
          <p>Everything the agents made that waits for a yes. Approving here only marks it in n8n; nothing is posted or published from this page.</p>
        </div>
      </header>

      {s.approvals.length === 0 && (
        <div className="card glass"><div className="empty"><b>All clear</b>Nothing is waiting for a decision.</div></div>
      )}

      {APPROVAL_SOURCES.map((src) => {
        const items = s.approvals.filter((a) => a.sourceId === src.id);
        if (!items.length) return null;
        return (
          <section key={src.id} className="grid" style={{ gap: 16 }}>
            <div className="group-label">{src.label} · {items.length}</div>
            {items.map((a) => {
              const short = a.fields.filter((f) => !f.long);
              const long = a.fields.filter((f) => f.long);
              return (
                <article key={a.key} id={a.key} className="approval glass">
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div className="eyebrow" style={{ marginBottom: 6 }}>{a.project || a.sourceLabel} · {ago(a.createdAt, now)}</div>
                      <h3>{a.title}</h3>
                    </div>
                    <span className="pill warn"><span className="dot warn" />{a.status.replace(/_/g, " ")}</span>
                  </div>
                  {a.summary && <div className="usp">{a.summary}</div>}
                  {short.length > 0 && (
                    <dl className="kv">
                      {short.map((f) => (<FragmentKV key={f.label} k={f.label} v={f.value} />))}
                    </dl>
                  )}
                  {long.length > 0 && (
                    <details className="more">
                      <summary>Read the full plan, sources and the agent&apos;s notes</summary>
                      {long.map((f) => (
                        <div key={f.label}>
                          <h4>{f.label}</h4>
                          <pre>{f.value}</pre>
                        </div>
                      ))}
                    </details>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <ApprovalActions sourceId={a.sourceId} rowId={a.rowId} approveLabel={a.sourceId === "content_queue" ? "Approve plan" : "Approve"} />
                    {a.link && a.link.startsWith("https://") && (
                      <a className="link" href={a.link} target="_blank" rel="noreferrer">{a.sourceId === "content_queue" ? "Watch the draft →" : "Open in n8n →"}</a>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        );
      })}
    </>
  );
}

function FragmentKV({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </>
  );
}
