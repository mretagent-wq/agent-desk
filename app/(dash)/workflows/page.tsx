import Link from "next/link";
import { WorkflowSwitch } from "@/components/Controls";
import { LivePill } from "@/components/Status";
import { groupOf, WORKFLOW_GROUPS } from "@/lib/config";
import { ago, pct } from "@/lib/format";
import { getAgents } from "@/lib/live";
import { agentsUsing, n8nLink, nowFor, snapshot, statsByWorkflow } from "@/lib/view";

export default async function Workflows({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show = "all" } = await searchParams;
  const [s, agents] = await Promise.all([snapshot(), getAgents()]);
  const now = nowFor(s);
  const stats = statsByWorkflow(s);
  const list = s.workflows.filter((w) => (show === "live" ? w.active : show === "paused" ? !w.active : true));
  const order = [...WORKFLOW_GROUPS.map((g) => g.label), "Other"];
  const groups = order
    .map((label) => ({ label, items: list.filter((w) => groupOf(w.name) === label).sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name)) }))
    .filter((g) => g.items.length);
  const live = s.workflows.filter((w) => w.active).length;

  return (
    <>
      <header className="top">
        <div>
          <div className="eyebrow">n8n</div>
          <h1>Workflows</h1>
          <p>{live} of {s.workflows.length} are live. Pausing unpublishes a workflow; resuming republishes its last published version, never draft edits.</p>
        </div>
        <div className="filters">
          {[["all", "All"], ["live", "Live"], ["paused", "Paused or draft"]].map(([k, l]) => (
            <Link key={k} href={`/workflows?show=${k}`} className={`chip ${show === k ? "on" : ""}`}>{l}</Link>
          ))}
        </div>
      </header>

      <section className="card glass" style={{ padding: "22px 14px" }}>
        {groups.length === 0 && <div className="empty"><b>Nothing here</b>No workflows match this filter.</div>}
        {groups.map((g) => (
          <div key={g.label}>
            <div className="group-label" style={{ paddingLeft: 12 }}>{g.label}</div>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 56 }}>On</th>
                  <th>Workflow</th>
                  <th>Status</th>
                  <th className="hide-sm">Runs 7d</th>
                  <th className="hide-sm">Success</th>
                  <th className="hide-sm">Last run</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {g.items.map((w) => {
                  const st = stats.get(w.id);
                  const link = n8nLink(s, `/workflow/${w.id}`);
                  return (
                    <tr key={w.id}>
                      <td><WorkflowSwitch id={w.id} name={w.name} active={w.active} usedBy={agentsUsing(agents, w.id)} /></td>
                      <td>
                        <div className="name">{w.name}</div>
                        {w.description && <div className="desc">{w.description}</div>}
                      </td>
                      <td><LivePill live={w.active} draftLabel="Off" /></td>
                      <td className="num hide-sm">{st?.runs7 ?? 0}</td>
                      <td className="num hide-sm" style={{ color: st?.fails7 ? "var(--warn)" : undefined }}>{st?.runs7 ? pct(st.runs7 - st.fails7, st.runs7) : "–"}</td>
                      <td className="hide-sm muted">{ago(st?.last?.startedAt, now)}</td>
                      <td style={{ textAlign: "right" }}>
                        <div className="row-actions" style={{ justifyContent: "flex-end" }}>
                          <Link className="btn sm ghost" href={`/runs?workflow=${w.id}`}>Runs</Link>
                          {link && <a className="btn sm" href={link} target="_blank" rel="noreferrer">Open</a>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </section>
    </>
  );
}
