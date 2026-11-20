import Link from "next/link";
import OrgChart from "@/components/OrgChart";
import { EXTERNAL_INTAKE } from "@/lib/config";
import { ago } from "@/lib/format";
import { getChanges } from "@/lib/live";
import { getOrg } from "@/lib/org";
import type { ExternalEvent } from "@/lib/types";
import { n8nLink, nowFor, snapshot } from "@/lib/view";

function outsideAgents(events: ExternalEvent[]) {
  const by = new Map<string, ExternalEvent[]>();
  for (const e of events) by.set(e.agent, [...(by.get(e.agent) ?? []), e]);
  return [...by.entries()].map(([agent, es]) => {
    const sorted = es.sort((a, b) => b.at.localeCompare(a.at));
    return { agent, last: sorted[0], waiting: es.filter((e) => e.status === "needs_approval").length, count: es.length };
  });
}

export default async function TeamPage() {
  const [s, org, live] = await Promise.all([snapshot(), getOrg(), getChanges()]);
  const now = nowFor(s);
  const n = (st: string) => org.roles.filter((r) => r.status === st).length;
  const people = org.roles.filter((r) => r.type === "person").length;
  const outside = outsideAgents(s.external);
  const intakeLink = n8nLink(s, `/workflow/${EXTERNAL_INTAKE.workflowId}`);
  const intakeOn = s.workflows.find((w) => w.id === EXTERNAL_INTAKE.workflowId)?.active ?? false;

  return (
    <>
      <header className="top">
        <div>
          <div className="eyebrow">The whole team</div>
          <h1>Team</h1>
          <p>
            {org.roles.length} roles in {org.departments.length - 1} departments: {n("live")} live, {n("draft")} in draft, {n("planned")} planned,
            {" "}{n("hire")} to hire and {people} people. Tap anyone to see what they do.
          </p>
        </div>
      </header>

      {live.error && (
        <div className="banner glass"><span className="dot bad" /><span>{live.error}</span></div>
      )}

      <section>
        <OrgChart roles={org.roles} depts={org.departments} />
        <div className="oc-legend">
          <span><span className="dot ok" />Live in n8n</span>
          <span><span className="dot warn" />Draft, built and not running</span>
          <span><span className="dot" />Planned</span>
          <span><span className="dot hire" />To hire</span>
          <span><span className="dot info" />Person or outside n8n</span>
          <span>Lines show who reports to whom. Tap a role to light up its hand-offs.</span>
        </div>
      </section>

      <section>
        <div className="sect-head">
          <h2>Outside agents</h2>
          <span className="muted small">
            Agents that live elsewhere report in through the External Agent Intake in n8n
            {intakeLink ? <> (<a className="link" href={intakeLink} target="_blank" rel="noreferrer">open</a>)</> : null}.
            {" "}{intakeOn ? "It's on." : "It's off until you switch it on."}
          </span>
        </div>
        {outside.length === 0 ? (
          <div className="glass card muted">No outside agent has reported in yet. When one does, it shows here with its last task and status, and anything it marks as needing a yes goes to Approvals.</div>
        ) : (
          <div className="outside">
            {outside.map((o) => (
              <div key={o.agent} className="glass card out">
                <div className="brief-top">
                  <b>{o.agent}</b>
                  <span className={`pill ${o.last.status === "failed" ? "bad" : o.last.status === "needs_approval" ? "warn" : o.last.status === "done" ? "ok" : "info"}`}>{o.last.status.replace(/_/g, " ")}</span>
                </div>
                <div className="sub">{o.last.task}</div>
                {o.last.summary && <div className="muted small">{o.last.summary}</div>}
                <div className="muted small">Last report {ago(o.last.at, now)} · {o.count} report{o.count === 1 ? "" : "s"}{o.waiting ? <> · <Link className="link" href="/approvals">{o.waiting} waiting</Link></> : null}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
