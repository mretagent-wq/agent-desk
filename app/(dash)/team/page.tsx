import Link from "next/link";
import { IconShield } from "@/components/Icons";
import { AGENTS, EXTERNAL_INTAKE } from "@/lib/config";
import { ago, when } from "@/lib/format";
import {
  DEPTS,
  EDGES,
  GATE_APPROVALS,
  ROLES,
  CONTENT_TEAM,
  STRUCTURE,
  chainFor,
  deptColor,
  gate,
  label,
  role,
  sideEdges,
  type Edge,
  type Role,
  type RoleStatus,
  type Step,
} from "@/lib/structure";
import type { ExternalEvent, Snapshot } from "@/lib/types";
import { agentActivity, isShared, n8nLink, nowFor, snapshot, statsByWorkflow } from "@/lib/view";

const STATUS: Record<RoleStatus, [string, string]> = {
  live: ["ok", "Live"],
  draft: ["warn", "Draft"],
  hiring: ["gold", "Hiring"],
  planned: ["", "Planned"],
  external: ["info", "Outside n8n"],
  active: ["info", "Person"],
};

const SIDE: Record<string, string> = { revision: "↺ Sends back to", data: "⇢ Feeds", reports: "↑ Reports to", hands_off: "→ Hands to", approval: "→ Passes to", request: "→ Asks" };

interface Activity { text: string; tone: string; pulse: boolean }
type Stats = ReturnType<typeof statsByWorkflow>;

function activityFor(r: Role, s: Snapshot, stats: Stats, now: number): Activity | null {
  const a = AGENTS.find((x) => x.id === r.n8n_agent_id);
  const ids = [...(a?.toolWorkflowIds ?? []), ...(r.n8n_workflow_ids ?? [])];
  if (!ids.length) return null;
  const own = ids.filter((id) => !isShared(id));
  if (s.executions.some((e) => own.includes(e.workflowId) && (e.status === "running" || e.status === "new" || e.status === "waiting"))) {
    return { text: "Working now", tone: "info", pulse: true };
  }
  const { runs24, runs7, fails7, last } = agentActivity(ids, stats);
  if (fails7 && last && s.executions.find((e) => e.startedAt === last && own.includes(e.workflowId))?.status === "error") {
    return { text: `Last run failed, ${ago(last, now)}`, tone: "bad", pulse: false };
  }
  if (runs24) return { text: `${runs24} run${runs24 === 1 ? "" : "s"} today`, tone: "ok", pulse: false };
  if (runs7) return { text: `Idle, last active ${ago(last, now)}`, tone: "", pulse: false };
  return { text: "No runs this week", tone: "", pulse: false };
}

function RoleNode({ r, act, compact }: { r: Role; act: Activity | null; compact?: boolean }) {
  const [tone, text] = STATUS[r.status] ?? ["", r.status];
  return (
    <div className={`node glass ${r.kind} ${r.status}${compact ? " compact" : ""}`} style={{ ["--accent" as string]: deptColor(r.department) }} title={r.why_it_matters ?? r.job}>
      <b className="node-name">{r.name}</b>
      <div className="node-status">
        <span className={`dot ${act?.tone || tone} ${act?.pulse ? "pulse" : ""}`} />
        <span className={`st ${tone}`}>{text}</span>
        {act && <span className="act">· {act.text}</span>}
      </div>
      <div className="node-does">{r.job}</div>
      {r.outward_actions && r.kind !== "human" && <div className="node-esc">Acts outside: every action waits for a yes</div>}
    </div>
  );
}

function GateNode({ id, waiting }: { id: string; waiting: number | null }) {
  const g = gate(id);
  if (!g) return null;
  return (
    <div className="gate-node">
      <div className="gate-name"><IconShield /> {g.name}</div>
      <div className="gate-who">{g.approvers.map(label).join(" and ")}</div>
      <div className="gate-rule">{g.rule}</div>
      {waiting !== null && (
        <Link href="/approvals" className={`gate-count ${waiting ? "on" : ""}`}>{waiting} waiting</Link>
      )}
    </div>
  );
}

function Connector({ e }: { e?: Edge }) {
  if (!e) return null;
  return (
    <div className={`conn ${e.type}`}>
      <span className="conn-line" />
      <span className="conn-label">{e.label}</span>
    </div>
  );
}

function Sides({ id, drawn }: { id: string; drawn: Set<Edge> }) {
  const edges = sideEdges(id, drawn);
  if (!edges.length) return null;
  // Several feeds to the same role read as one line.
  const grouped = new Map<string, Edge[]>();
  for (const e of edges) grouped.set(`${e.type}:${e.to}`, [...(grouped.get(`${e.type}:${e.to}`) ?? []), e]);
  return (
    <ul className="sides">
      {[...grouped.values()].map((es) => (
        <li key={`${es[0].type}:${es[0].to}`} className={es[0].type}>
          <span>{SIDE[es[0].type] ?? "→"} <b>{label(es[0].to)}</b></span>
          <span className="muted">{es[0].label}</span>
        </li>
      ))}
    </ul>
  );
}

function outsideAgents(events: ExternalEvent[]) {
  const by = new Map<string, ExternalEvent[]>();
  for (const e of events) by.set(e.agent, [...(by.get(e.agent) ?? []), e]);
  return [...by.entries()].map(([agent, es]) => {
    const sorted = es.sort((a, b) => b.at.localeCompare(a.at));
    return { agent, last: sorted[0], waiting: es.filter((e) => e.status === "needs_approval").length, count: es.length };
  });
}

export default async function Team() {
  const s = await snapshot();
  const now = nowFor(s);
  const stats = statsByWorkflow(s);
  const waitingBy = new Map<string, number>();
  for (const a of s.approvals) waitingBy.set(a.sourceId, (waitingBy.get(a.sourceId) ?? 0) + 1);
  const gateWaiting = (id: string) => (GATE_APPROVALS[id] ? waitingBy.get(GATE_APPROVALS[id]) ?? 0 : null);
  const act = (r: Role) => activityFor(r, s, stats, now);

  const command = DEPTS.find((d) => d.id === "command");
  const people = (command?.members ?? ROLES.filter((r) => r.kind === "human").map((r) => r.id)).map(role).filter((r): r is Role => Boolean(r));
  const orch = ROLES.find((r) => r.kind === "orchestrator");
  const depts = DEPTS.filter((d) => d.id !== "command");
  const routed = new Set(EDGES.filter((e) => e.type === "delegates").map((e) => e.to));

  const counts: Record<string, number> = {};
  for (const r of ROLES) if (r.kind !== "human") counts[r.status] = (counts[r.status] ?? 0) + 1;
  const outside = outsideAgents(s.external);
  const intakeLink = n8nLink(s, `/workflow/${EXTERNAL_INTAKE.workflowId}`);
  const intakeOn = s.workflows.find((w) => w.id === EXTERNAL_INTAKE.workflowId)?.active ?? false;

  return (
    <>
      <header className="top">
        <div>
          <div className="eyebrow">Dan&apos;s agent department</div>
          <h1>Team</h1>
          <p>
            How work moves between the agents and where it stops for your yes. {counts.live ?? 0} live, {counts.draft ?? 0} in draft,
            {counts.hiring ? ` ${counts.hiring} being hired,` : ""}{" "}{counts.planned ?? 0} planned{counts.external ? `, ${counts.external} outside n8n` : ""}. Roster {STRUCTURE.version}, updated {when(`${STRUCTURE.updated}T12:00:00Z`)}; live activity from n8n.
          </p>
        </div>
      </header>

      {CONTENT_TEAM && (
        <div className="banner glass">
          <span className="dot warn" />
          <span><b>Marketing and content shows the lean content team ({CONTENT_TEAM.version}).</b> {CONTENT_TEAM.status ? `Status: ${CONTENT_TEAM.status}.` : ""} New roles marked Hiring are being sourced through the Hiring Manager.</span>
        </div>
      )}

      <section className="grid three explain">
        <div className="glass card">
          <div className="k">Delegation</div>
          <p>You ask the Orchestrator. It routes the job to the right department, and the department head hands it down the line.</p>
        </div>
        <div className="glass card">
          <div className="k">Hand-offs</div>
          <p>Inside a department, each agent passes its work to the next. A checker can send it back with notes until it passes.</p>
        </div>
        <div className="glass card">
          <div className="k">Approval gates</div>
          <p>Anything that posts, sends, spends, hires or changes a site stops at a gold gate for a person. {s.approvals.length ? <Link href="/approvals">{s.approvals.length} waiting now.</Link> : "Nothing waiting now."}</p>
        </div>
      </section>

      <section className="glass card org-wrap">
        <div className="org">
          <div className="org-top">
            <div className="people">
              {people.map((p) => <RoleNode key={p.id} r={p} act={null} compact />)}
            </div>
            {orch && (
              <>
                <div className="vline"><span>asks</span><span className="up">reports back, asks for approvals</span></div>
                <RoleNode r={orch} act={act(orch)} />
                <div className="vline"><span>routes each job</span><span className="up">results and status</span></div>
              </>
            )}
          </div>
          <div className="depts" style={{ ["--n" as string]: depts.length }}>
            {depts.map((d) => {
              const steps: Step[] = chainFor(d);
              const drawn = new Set(steps.map((st) => st.via).filter((e): e is Edge => Boolean(e)));
              return (
                <div key={d.id} className="dept" style={{ ["--accent" as string]: deptColor(d.id) }}>
                  <div className="dept-name">{d.name}</div>
                  {steps.map((st, i) => {
                    const r = role(st.id);
                    return (
                      <div key={`${st.id}-${i}`} className="step">
                        {i > 0 && (st.via ? <Connector e={st.via} /> : <div className="conn loose"><span className="conn-label">Also in this team</span></div>)}
                        {st.kind === "gate" ? <GateNode id={st.id} waiting={gateWaiting(st.id)} /> : r ? (
                          <>
                            {routed.has(r.id) && i > 0 && <div className="routed">Orchestrator routes here too</div>}
                            <RoleNode r={r} act={act(r)} compact={i > 0} />
                          </>
                        ) : null}
                        {st.kind === "role" && <Sides id={st.id} drawn={drawn} />}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        <div className="legend">
          <span><span className="dot ok" />Live in n8n</span>
          <span><span className="dot warn" />Draft, not running</span>
          <span><span className="dot gold" />Being hired</span>
          <span><span className="dot" />Planned, not built</span>
          <span><span className="dot info" />Person or outside n8n</span>
          <span><IconShield />Waits for a person</span>
          <span>↺ Sent back with notes</span>
          <span>⇢ Data feed</span>
          {depts.length > 5 && <span className="hint">Scroll sideways for every department</span>}
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

      <p className="muted small" style={{ padding: "0 4px" }}>
        The chart is drawn from the team roster file (<code>data/team-structure.json</code>, copied from <code>agent-team/structure.json</code> on each build). Change the roster and redeploy; no code change needed.
      </p>
    </>
  );
}
