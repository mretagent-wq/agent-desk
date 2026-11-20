/**
 * The team structure behind the Team and Content pages.
 *
 * The roles, departments, approval gates and hand-offs come from data/team-structure.json, a copy of
 * agent-team/structure.json from the agent team work. `npm run build` and `npm run dev` refresh the copy
 * when that file sits next to this project (scripts/sync-team.mjs), so a new roster shows up on the next deploy
 * with no code change.
 *
 * What lives here instead: department colours, which approval gate feeds which Approvals table, and which
 * roles make up the content pipeline. All are keyed by id, so a role that is renamed keeps working; a role that
 * is removed simply drops off the page.
 */
import raw from "@/data/team-structure.json";

export type Kind = "human" | "orchestrator" | "head" | "worker" | "reviewer";
export type RoleStatus = "live" | "draft" | "hiring" | "planned" | "external" | "active";
export type EdgeType = "request" | "delegates" | "reports" | "hands_off" | "revision" | "approval" | "data";

export interface Role {
  id: string;
  name: string;
  department: string;
  kind: Kind;
  status: RoleStatus;
  priority: number;
  job: string;
  why_it_matters?: string;
  sourcing?: string;
  sourcing_note?: string;
  outward_actions?: boolean;
  n8n_agent_id: string | null;
  /** Optional: workflows whose runs count as this role's activity (for agents that live outside n8n Agents). */
  n8n_workflow_ids?: string[];
}
export interface Dept { id: string; name: string; head: string; members: string[] }
export interface Gate { id: string; name: string; approvers: string[]; rule: string }
export interface Edge { from: string; to: string; type: EdgeType; label: string }

export interface ContentTeam { version: string; updated: string; status: string; doc: string; schedule: { when: string; step: string }[] }

interface Structure {
  content_team?: ContentTeam;
  version: string;
  updated: string;
  title: string;
  legend?: { edge_type?: Record<string, string> };
  nodes: Role[];
  departments: Dept[];
  approval_gates: Gate[];
  edges: Edge[];
}

export const STRUCTURE = raw as unknown as Structure;
export const ROLES = STRUCTURE.nodes;
export const DEPTS = STRUCTURE.departments;
export const GATES = STRUCTURE.approval_gates ?? [];
export const EDGES = STRUCTURE.edges ?? [];

/** Department colours. Unknown departments get one from the fallback list. */
const DEPT_COLOR: Record<string, string> = {
  command: "#d9b979",
  marketing: "#d9b979",
  growth: "#f2a65a",
  sales: "#86d9ad",
  web: "#7fd3e0",
  ops: "#9cc2ff",
  people: "#ff8a5c",
  back_office: "#c9a2f2",
};
const FALLBACK = ["#e6c88f", "#8fd0c0", "#b7a6f0", "#f0a3b8", "#a9d58b"];
export function deptColor(id: string | undefined): string {
  if (!id) return "var(--gold)";
  return DEPT_COLOR[id] ?? FALLBACK[Math.abs([...id].reduce((n, c) => n + c.charCodeAt(0), 0)) % FALLBACK.length];
}

/** Which Approvals table each gate fills. Gates not listed here show their rule but no live count. */
export const GATE_APPROVALS: Record<string, string> = {
  gate_post: "content_queue",
  gate_site: "seo_fix_lists",
};

/** What each stage of the content pipeline is called. Roles not listed get a label from their kind. */
const STAGE: Record<string, string> = {
  strategist: "Plans",
  platform_strategist: "Specs per platform",
  copywriter: "Writes",
  content: "Makes the cut",
  sound: "Adds sound",
  editor: "Checks",
  gate_post: "Approves",
  poster: "Posts",
  publisher: "Posts",
  optimizer: "Tunes per platform",
  performance: "Learns",
};

/** The content pipeline: the Marketing and content department's chain, in order. Follows the roster file. */
export function contentPipeline(): { stage: string; id: string }[] {
  const d = DEPTS.find((x) => x.id === "marketing");
  if (!d) return [];
  return chainFor(d).map((st) => ({
    id: st.id,
    stage: STAGE[st.id] ?? (st.kind === "gate" ? "Approves" : role(st.id)?.kind === "reviewer" ? "Checks" : role(st.id)?.kind === "head" ? "Plans" : "Does"),
  }));
}

export const CONTENT_TEAM = STRUCTURE.content_team;

export function role(id: string | undefined | null): Role | undefined {
  return ROLES.find((r) => r.id === id);
}
export function gate(id: string | undefined | null): Gate | undefined {
  return GATES.find((g) => g.id === id);
}
export function label(id: string): string {
  return role(id)?.name ?? gate(id)?.name ?? id;
}
export function deptOf(id: string): Dept | undefined {
  const r = role(id);
  return r ? DEPTS.find((d) => d.id === r.department) : undefined;
}

export type Step =
  | { kind: "role"; id: string; via?: Edge }
  | { kind: "gate"; id: string; via?: Edge };

/**
 * The order work moves through one department: start at the head and follow hand-offs, approvals and
 * in-department data feeds. Roles in the department that the chain never reaches are added at the end.
 */
export function chainFor(d: Dept): Step[] {
  const inDept = new Set([d.head, ...d.members]);
  const steps: Step[] = [];
  const seen = new Set<string>();
  const push = (id: string, via?: Edge) => {
    seen.add(id);
    steps.push(gate(id) ? { kind: "gate", id, via } : { kind: "role", id, via });
  };
  if (role(d.head)) push(d.head);
  for (let i = 0; i < steps.length; i++) {
    const from = steps[i].id;
    const next = EDGES.filter(
      (e) =>
        e.from === from &&
        !seen.has(e.to) &&
        (e.type === "hands_off" || e.type === "approval" || (e.type === "data" && inDept.has(e.to))) &&
        (gate(e.to) || inDept.has(e.to)),
    );
    for (const e of next) if (!seen.has(e.to)) push(e.to, e);
  }
  for (const id of d.members) if (!seen.has(id) && role(id)) push(id);
  return steps;
}

/** Edges leaving a step that the chain doesn't draw: revisions, cross-team feeds, reports to someone other than the Orchestrator. */
export function sideEdges(id: string, drawn: Set<Edge>): Edge[] {
  return EDGES.filter((e) => e.from === id && !drawn.has(e) && !(e.type === "reports" && role(e.to)?.kind === "orchestrator") && e.type !== "delegates");
}
