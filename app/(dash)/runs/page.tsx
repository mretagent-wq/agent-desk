import Link from "next/link";
import { RunActions } from "@/components/Controls";
import { RunPill } from "@/components/Status";
import { AGENTS } from "@/lib/config";
import { ago, duration, when } from "@/lib/format";
import { nowFor, snapshot, wfName } from "@/lib/view";

const FILTERS = [
  ["all", "All"],
  ["error", "Failed"],
  ["running", "Running"],
  ["waiting", "Waiting"],
  ["success", "Succeeded"],
] as const;

export default async function Runs({ searchParams }: { searchParams: Promise<{ status?: string; workflow?: string; agent?: string }> }) {
  const q = await searchParams;
  const status = q.status ?? "all";
  const s = await snapshot();
  const now = nowFor(s);
  const agent = AGENTS.find((a) => a.id === q.agent);
  const wfFilter = q.workflow ? [q.workflow] : agent ? agent.toolWorkflowIds : null;
  const rows = s.executions
    .filter((e) => (status === "all" ? true : status === "error" ? e.status === "error" || e.status === "crashed" : e.status === status))
    .filter((e) => (wfFilter ? wfFilter.includes(e.workflowId) : true))
    .slice(0, 200);
  const scope = agent ? `${agent.name}'s tools` : q.workflow ? wfName(s, q.workflow) : "All workflows";
  const qs = (st: string) => {
    const p = new URLSearchParams();
    if (st !== "all") p.set("status", st);
    if (q.workflow) p.set("workflow", q.workflow);
    if (q.agent) p.set("agent", q.agent);
    const str = p.toString();
    return str ? `/runs?${str}` : "/runs";
  };

  return (
    <>
      <header className="top">
        <div>
          <div className="eyebrow">{scope}</div>
          <h1>Runs</h1>
          <p>The last 7 days of executions. Agent conversations themselves live in n8n; the tools they call show up here.</p>
        </div>
        <div className="filters">
          {FILTERS.map(([k, l]) => (
            <Link key={k} href={qs(k)} className={`chip ${status === k ? "on" : ""}`}>{l}</Link>
          ))}
          {(q.workflow || q.agent) && <Link href={status === "all" ? "/runs" : `/runs?status=${status}`} className="chip">Clear ✕</Link>}
        </div>
      </header>

      <section className="card glass" style={{ padding: "22px 14px" }}>
        {rows.length === 0 ? (
          <div className="empty"><b>No runs</b>Nothing matches this view in the last 7 days.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Run</th>
                <th>Workflow</th>
                <th>Status</th>
                <th className="hide-sm">Started</th>
                <th className="hide-sm">Took</th>
                <th className="hide-sm">How</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td className="num"><Link className="link" href={`/runs/${e.id}`}>#{e.id}</Link></td>
                  <td><div className="name">{wfName(s, e.workflowId)}</div></td>
                  <td><RunPill status={e.status} /></td>
                  <td className="hide-sm"><span title={when(e.startedAt)}>{ago(e.startedAt, now)}</span></td>
                  <td className="num hide-sm muted">{duration(e.startedAt, e.stoppedAt)}</td>
                  <td className="hide-sm muted">{e.mode}</td>
                  <td style={{ textAlign: "right" }}>
                    <div className="row-actions" style={{ justifyContent: "flex-end" }}>
                      <RunActions id={e.id} status={e.status} compact />
                      <Link className="btn sm ghost" href={`/runs/${e.id}`}>Details</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
