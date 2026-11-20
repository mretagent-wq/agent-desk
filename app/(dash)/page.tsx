import Link from "next/link";
import Bars from "@/components/Bars";
import { LivePill, RunPill } from "@/components/Status";
import { getAgents, recentChanges } from "@/lib/live";
import { ago, duration } from "@/lib/format";
import { agentActivity, nowFor, snapshot, statsByWorkflow, wfName } from "@/lib/view";

const CHANGE_KIND: Record<string, string> = {"role": "Role", "department": "Department", "gate": "Gate", "link": "Hand-off", "content_team": "Content team", "agent": "Agent", "post": "Post", "video": "Video", "plan": "Plan"};

export default async function Overview() {
  const [s, AGENTS, live] = await Promise.all([snapshot(), getAgents(), recentChanges(5)]);
  const now = nowFor(s);
  const stats = statsByWorkflow(s);
  const day = s.executions.filter((e) => now - new Date(e.startedAt).getTime() < 86400000);
  const fails = day.filter((e) => e.status === "error" || e.status === "crashed");
  const liveWf = s.workflows.filter((w) => w.active).length;
  const liveAgents = AGENTS.filter((a) => a.published).length;
  const recentFails = s.executions.filter((e) => e.status === "error" || e.status === "crashed").slice(0, 4);
  const dateLabel = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric" }).format(new Date(now));

  return (
    <>
      <header className="top">
        <div>
          <div className="eyebrow">Overview</div>
          <h1>{dateLabel}</h1>
          <p>
            {s.approvals.length
              ? `${s.approvals.length} item${s.approvals.length === 1 ? "" : "s"} waiting on you. ${fails.length ? `${fails.length} failed run${fails.length === 1 ? "" : "s"} today.` : "No failed runs today."}`
              : fails.length
                ? `Nothing waiting on you. ${fails.length} failed run${fails.length === 1 ? "" : "s"} today.`
                : "Nothing waiting on you, and nothing failed today."}
          </p>
        </div>
      </header>

      <section className="grid kpis">
        <Link href="/approvals" className="kpi glass accent" style={{ color: "inherit", textDecoration: "none" }}>
          <div className="label">Waiting on you</div>
          <div className="value">{s.approvals.length}</div>
          <div className="note">Plans and fix lists to approve</div>
        </Link>
        <div className="kpi glass">
          <div className="label">Agents live</div>
          <div className="value">{liveAgents}<small>/ {AGENTS.length}</small></div>
          <div className="note"><span className={`dot ${AGENTS.some((a) => !a.published) ? "warn" : "ok"}`} /> {AGENTS.filter((a) => !a.published).map((a) => a.name).join(", ") || "All"}{AGENTS.some((a) => !a.published) ? " in draft" : " live"}</div>
        </div>
        <div className="kpi glass">
          <div className="label">Workflows live</div>
          <div className="value">{liveWf}<small>/ {s.workflows.length}</small></div>
          <div className="note">Agent tools and automations</div>
        </div>
        <div className="kpi glass">
          <div className="label">Runs, 24h</div>
          <div className="value">{day.length}</div>
          <div className="note">{s.executions.length} in the last 7 days</div>
        </div>
        <div className="kpi glass">
          <div className="label">Failed, 24h</div>
          <div className="value" style={{ color: fails.length ? "var(--bad)" : undefined }}>{fails.length}</div>
          <div className="note">{day.length ? `${Math.round(((day.length - fails.length) / day.length) * 100)}% succeeded` : "No runs yet"}</div>
        </div>
      </section>

      <section className="grid two">
        <div className="card glass">
          <div className="card-head">
            <h2>Needs your call</h2>
            <Link href="/approvals">Open approvals →</Link>
          </div>
          {s.approvals.length === 0 ? (
            <div className="empty"><b>All clear</b>Nothing is waiting for a decision.</div>
          ) : (
            <div className="list">
              {s.approvals.slice(0, 5).map((a) => (
                <Link key={a.key} href={`/approvals#${a.key}`} className="li" style={{ color: "inherit", textDecoration: "none" }}>
                  <span className="dot warn" />
                  <div className="grow">
                    <div className="name">{a.title}</div>
                    <div className="meta">{a.sourceLabel}{a.project ? ` · ${a.project}` : ""} · {ago(a.createdAt, now)}</div>
                  </div>
                  <span className="pill warn">{a.status.replace(/_/g, " ")}</span>
                </Link>
              ))}
            </div>
          )}
          <div style={{ marginTop: 22 }}>
            <div className="card-head" style={{ marginBottom: 6 }}>
              <h3>Activity, last 24 hours</h3>
              <span className="muted small">{day.length} runs</span>
            </div>
            <Bars executions={s.executions} now={now} />
          </div>
        </div>

        <div className="grid" style={{ alignContent: "start" }}>
          <div className="card glass">
            <div className="card-head">
              <h2>The team</h2>
              <Link href="/agents">All agents →</Link>
            </div>
            <div className="list">
              {AGENTS.map((a) => {
                const { runs24: runs, last } = agentActivity(AGENTS, a.toolWorkflowIds, stats);
                return (
                  <div key={a.id} className="li">
                    <span className="orb" style={{ width: 32, height: 32, borderRadius: 8, fontSize: 14, ["--c1" as string]: a.gradient[0] }}>{a.name.charAt(0)}</span>
                    <div className="grow">
                      <div className="name">{a.name}</div>
                      <div className="meta">{runs} tool calls today · last {ago(last, now)}</div>
                    </div>
                    <LivePill live={a.published} draftLabel="Draft" />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card glass">
            <div className="card-head">
              <h2>Changes from chat</h2>
              <Link href="/team">Team →</Link>
            </div>
            {live.error ? (
              <div className="empty"><b>Couldn&apos;t read changes</b>{live.error}</div>
            ) : live.changes.length === 0 ? (
              <div className="empty"><b>None yet</b>Ask in chat to add an agent, change a role or move a post, and it shows here and on its page right away.</div>
            ) : (
              <div className="list">
                {live.changes.map((c) => (
                  <div key={c.id} className="li">
                    <span className={`dot ${c.problem ? "bad" : c.removed ? "warn" : "ok"}`} />
                    <div className="grow">
                      <div className="name">{CHANGE_KIND[c.kind] ?? c.kind} {c.removed ? "removed" : "updated"}: {c.key}</div>
                      <div className="meta">{c.problem ? `Not applied: ${c.problem}` : c.note || "No note"}{c.by ? ` · ${c.by}` : ""} · {ago(c.at, now)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card glass">
            <div className="card-head">
              <h2>Recent failures</h2>
              <Link href="/runs?status=error">See all →</Link>
            </div>
            {recentFails.length === 0 ? (
              <div className="empty"><b>Clean</b>No failed runs this week.</div>
            ) : (
              <div className="list">
                {recentFails.map((e) => (
                  <Link key={e.id} href={`/runs/${e.id}`} className="li" style={{ color: "inherit", textDecoration: "none" }}>
                    <span className="dot bad" />
                    <div className="grow">
                      <div className="name">{wfName(s, e.workflowId)}</div>
                      <div className="meta">Run #{e.id} · {ago(e.startedAt, now)} · {duration(e.startedAt, e.stoppedAt)}</div>
                    </div>
                    <RunPill status={e.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
