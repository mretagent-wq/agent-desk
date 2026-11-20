import Link from "next/link";
import { IconShield } from "@/components/Icons";
import { LivePill } from "@/components/Status";
import { AGENTS_SYNCED_AT, EXTERNAL_INTAKE } from "@/lib/config";
import { getAgents } from "@/lib/live";
import { ago, when } from "@/lib/format";
import { agentActivity, isShared, n8nLink, nowFor, snapshot, statsByWorkflow, wfName } from "@/lib/view";

export default async function Agents() {
  const [s, AGENTS] = await Promise.all([snapshot(), getAgents()]);
  const now = nowFor(s);
  const stats = statsByWorkflow(s);
  const byId = new Map(s.workflows.map((w) => [w.id, w]));
  const intake = byId.get(EXTERNAL_INTAKE.workflowId);
  const intakeLink = n8nLink(s, `/workflow/${EXTERNAL_INTAKE.workflowId}`);
  const outside = new Map<string, typeof s.external>();
  for (const e of [...s.external].sort((a, b) => b.at.localeCompare(a.at))) outside.set(e.agent, [...(outside.get(e.agent) ?? []), e]);
  const tone = (st: string) => (st === "failed" ? "bad" : st === "needs_approval" ? "warn" : st === "done" ? "ok" : "info");

  return (
    <>
      <header className="top">
        <div>
          <div className="eyebrow">Dan&apos;s agent department</div>
          <h1>Agents</h1>
          <p>Activity counts runs of each agent&apos;s own tool workflows; shared tools are listed but not counted. Live or draft status was last synced {when(AGENTS_SYNCED_AT)}.</p>
        </div>
      </header>

      <section className="grid three">
        {AGENTS.map((a) => {
          const tools = a.toolWorkflowIds.map((id) => ({ id, w: byId.get(id), st: stats.get(id) }));
          const { runs24, runs7, fails7, last } = agentActivity(AGENTS, a.toolWorkflowIds, stats);
          const link = n8nLink(s, "/");
          const subs = (a.subAgents ?? []).map((id) => AGENTS.find((x) => x.id === id)?.name).filter(Boolean);
          return (
            <article key={a.id} className="agent glass" style={{ ["--c1" as string]: a.gradient[0], ["--c2" as string]: a.gradient[1] }}>
              <div className="agent-top">
                <span className="orb" />
                <div style={{ flex: 1 }}>
                  <h3>{a.name}</h3>
                  <div className="muted small" style={{ marginTop: 4 }}>Last active {ago(last, now)}</div>
                </div>
                <LivePill live={a.published} draftLabel="Draft" />
              </div>
              <div className="role">{a.role}</div>
              <div className="stats">
                <div className="stat"><div className="k">Today</div><div className="v">{runs24}</div></div>
                <div className="stat"><div className="k">7 days</div><div className="v">{runs7}</div></div>
                <div className="stat"><div className="k">Failed</div><div className="v" style={{ color: fails7 ? "var(--bad)" : undefined }}>{fails7}</div></div>
              </div>
              <div>
                <div className="group-label" style={{ marginTop: 0 }}>Tools</div>
                <div className="tools">
                  {tools.map((t) => (
                    <div key={t.id} className="tool">
                      <span className={`dot ${t.w?.active ? "ok" : ""}`} />
                      <span className="grow">{t.w ? wfName(s, t.id) : `Missing workflow ${t.id}`}</span>
                      {isShared(AGENTS, t.id) && <span className="pill" style={{ padding: "0 8px", fontSize: 10.5 }}>shared</span>}
                      <span className="muted">{t.st?.runs7 ?? 0}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="small sub">
                Writes to {a.tables.join(", ")}
                {subs.length ? <> · Hands work to {subs.join(" and ")}</> : null}
              </div>
              <div className="guard"><IconShield /> <span>{a.outward}</span></div>
              <div className="row-actions">
                {link ? (
                  <a className="btn sm" href={link} target="_blank" rel="noreferrer">Open n8n</a>
                ) : (
                  <span className="btn sm" aria-disabled title="Connect n8n to link out">Open n8n</span>
                )}
                <Link className="btn sm ghost" href={`/runs?agent=${a.id}`}>Tool runs</Link>
              </div>
            </article>
          );
        })}
      </section>

      <section>
        <div className="sect-head">
          <h2>Outside agents</h2>
          <span className="muted small">
            Agents that run outside n8n and report in through the External Agent Intake. {intake?.active ? "The intake is on." : "The intake is off until you switch it on."}
            {intakeLink ? <> <a className="link" href={intakeLink} target="_blank" rel="noreferrer">Open it in n8n</a></> : null}
          </span>
        </div>
        {outside.size === 0 ? (
          <div className="glass card muted">No outside agent has reported in yet. Each report it sends shows here, and anything it marks as needing your yes goes to <Link className="link" href="/approvals">Approvals</Link>.</div>
        ) : (
          <div className="outside">
            {[...outside.entries()].map(([agent, es]) => (
              <article key={agent} className="glass card out">
                <div className="brief-top">
                  <b>{agent}</b>
                  <span className={`pill ${tone(es[0].status)}`}>{es[0].status.replace(/_/g, " ")}</span>
                </div>
                <div className="muted small">Last report {ago(es[0].at, now)} · {es.length} in total</div>
                <div className="list">
                  {es.slice(0, 4).map((e) => (
                    <div key={e.id} className="li" style={{ gap: 10, padding: "8px 2px", fontSize: 12.5 }}>
                      <span className={`dot ${tone(e.status)}`} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        {e.link ? <a className="link" href={e.link} target="_blank" rel="noreferrer">{e.task}</a> : e.task}
                        {e.summary ? <span className="muted small"> · {e.summary}</span> : null}
                      </span>
                      <span className="muted small">{ago(e.at, now)}</span>
                    </div>
                  ))}
                </div>
                <div className="guard"><IconShield /> <span>Reports only. The desk never calls this agent, and nothing it asks for happens without your yes.</span></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
