import "server-only";
import { readFileSync } from "node:fs";
import { cache } from "react";
import { AGENTS, LIVE_CHANGES } from "./config";
import { DRIVE_VIDEOS, PLAN, PLAN_META, type DriveVideo, type PlannedPost } from "./content-plan";
import { isPreview } from "./mode";
import * as n8n from "./n8n";
import type { Row } from "./n8n";
import { PREVIEW_ROWS } from "./preview-rows";
import { BASE_STRUCTURE, makeTeam, type Dept, type Edge, type Gate, type Role, type Structure } from "./structure";
import type { AgentDef } from "./types";

/**
 * Live changes from chat.
 *
 * The roster, agents and content plan ship with the code as a baseline. Any chat session (or person) can change
 * them without a redeploy by adding a row to the n8n data table desk_changes:
 *
 *   kind      role | department | gate | link | content_team | agent | post | video | plan
 *   item_key  which item: a role, department, gate or agent id; "from>to>type" for a link; "YYYY-MM-DD 1 pm" for a
 *             post; a Drive file id for a video; "meta" for plan and content_team
 *   data      JSON object with only the fields that change (a new item needs its required fields)
 *   removed   true to take the item off
 *   note      why, in a few words
 *   added_by  who made the change
 *
 * Rows are applied oldest first on every page load, so the newest row for an item wins and nothing is cached.
 * If the table can't be read, the pages show the baseline and say so.
 */

export interface Change {
  id: number;
  kind: string;
  key: string;
  data: Record<string, unknown> | null;
  removed: boolean;
  note: string;
  by: string;
  at: string;
  /** Why the row couldn't be applied, if it couldn't. */
  problem?: string;
}

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const strs = (v: unknown): string[] | undefined => (Array.isArray(v) ? v.map(str).filter(Boolean) : undefined);

function toChange(r: Row): Change {
  let data: Record<string, unknown> | null = null;
  let problem: string | undefined;
  const raw = str(r.data).trim();
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isObj(parsed)) data = parsed;
      else problem = "data isn't a JSON object";
    } catch {
      problem = "data isn't valid JSON";
    }
  }
  return {
    id: r.id,
    kind: str(r.kind).trim().toLowerCase(),
    key: str(r.item_key).trim(),
    data,
    removed: r.removed === true || r.removed === "true",
    note: str(r.note),
    by: str(r.added_by),
    at: str(r.createdAt),
    problem,
  };
}

/** Local preview only: rows from PREVIEW_ROWS, plus a JSON file named by PREVIEW_CHANGES_FILE so a change can be tried without restarting. */
function previewRows(): Row[] {
  const rows = [...(PREVIEW_ROWS[LIVE_CHANGES.tableId] ?? [])];
  const file = process.env.PREVIEW_CHANGES_FILE;
  if (file) {
    try {
      const extra: unknown = JSON.parse(readFileSync(file, "utf8"));
      if (Array.isArray(extra)) rows.push(...(extra as Row[]));
    } catch {
      /* no file yet */
    }
  }
  return rows;
}

/** Every change row, oldest first. Read once per request. */
export const getChanges = cache(async (): Promise<{ changes: Change[]; error: string | null }> => {
  if (isPreview()) return { changes: previewRows().map(toChange).sort(byAge), error: null };
  if (!n8n.n8nConfigured()) return { changes: [], error: null };
  try {
    const rows = await n8n.listRows(LIVE_CHANGES.tableId, 5000);
    return { changes: rows.map(toChange).sort(byAge), error: null };
  } catch (e) {
    return { changes: [], error: `Couldn't read changes from chat (${e instanceof Error ? e.message : "unknown error"}). Showing the roster as shipped.` };
  }
});

function byAge(a: Change, b: Change) {
  return a.at === b.at ? a.id - b.id : a.at.localeCompare(b.at);
}

/* ---------- roster ---------- */

const KINDS = new Set(["human", "orchestrator", "head", "worker", "reviewer"]);
const STATUSES = new Set(["live", "draft", "hiring", "planned", "external", "active"]);
const EDGE_TYPES = new Set(["request", "delegates", "reports", "hands_off", "revision", "approval", "data"]);

function mergeRole(base: Role | undefined, id: string, d: Record<string, unknown>): Role | string {
  const name = str(d.name ?? base?.name).trim();
  if (!name) return "a new role needs a name";
  const kind = str(d.kind ?? base?.kind ?? "worker");
  const status = str(d.status ?? base?.status ?? "planned");
  if (!KINDS.has(kind)) return `kind must be one of ${[...KINDS].join(", ")}`;
  if (!STATUSES.has(status)) return `status must be one of ${[...STATUSES].join(", ")}`;
  return {
    ...(base ?? {}),
    id,
    name,
    department: str(d.department ?? base?.department ?? ""),
    kind: kind as Role["kind"],
    status: status as Role["status"],
    priority: Number(d.priority ?? base?.priority ?? 9) || 9,
    job: str(d.job ?? base?.job ?? ""),
    why_it_matters: d.why_it_matters !== undefined ? str(d.why_it_matters) : base?.why_it_matters,
    sourcing: d.sourcing !== undefined ? str(d.sourcing) : base?.sourcing,
    sourcing_note: d.sourcing_note !== undefined ? str(d.sourcing_note) : base?.sourcing_note,
    outward_actions: d.outward_actions !== undefined ? d.outward_actions === true || d.outward_actions === "true" : base?.outward_actions,
    n8n_agent_id: d.n8n_agent_id !== undefined ? (d.n8n_agent_id ? str(d.n8n_agent_id) : null) : base?.n8n_agent_id ?? null,
    n8n_workflow_ids: strs(d.n8n_workflow_ids) ?? base?.n8n_workflow_ids,
  };
}

function applyRoster(base: Structure, changes: Change[]): Structure {
  const st: Structure = structuredClone(base);
  st.nodes ??= [];
  st.departments ??= [];
  st.approval_gates ??= [];
  st.edges ??= [];
  const dropId = (id: string) => {
    st.edges = st.edges.filter((e) => e.from !== id && e.to !== id);
    for (const d of st.departments) d.members = d.members.filter((m) => m !== id);
  };

  for (const c of changes) {
    if (c.problem) continue;
    const d = c.data ?? {};
    switch (c.kind) {
      case "role": {
        const i = st.nodes.findIndex((r) => r.id === c.key);
        if (c.removed) {
          if (i >= 0) st.nodes.splice(i, 1);
          dropId(c.key);
          break;
        }
        const merged = mergeRole(st.nodes[i], c.key, d);
        if (typeof merged === "string") { c.problem = merged; break; }
        if (i >= 0) st.nodes[i] = merged; else st.nodes.push(merged);
        // Keep department membership in step with the role's department.
        for (const dep of st.departments) {
          const listed = dep.head === c.key || dep.members.includes(c.key);
          if (dep.id === merged.department && !listed) dep.members.push(c.key);
          if (dep.id !== merged.department && dep.members.includes(c.key)) dep.members = dep.members.filter((m) => m !== c.key);
        }
        break;
      }
      case "department": {
        const i = st.departments.findIndex((x) => x.id === c.key);
        if (c.removed) { if (i >= 0) st.departments.splice(i, 1); break; }
        const cur: Dept | undefined = st.departments[i];
        const next: Dept = {
          id: c.key,
          name: str(d.name ?? cur?.name ?? c.key),
          head: str(d.head ?? cur?.head ?? ""),
          members: strs(d.members) ?? cur?.members ?? [],
        };
        if (i >= 0) st.departments[i] = next; else st.departments.push(next);
        break;
      }
      case "gate": {
        const i = st.approval_gates.findIndex((x) => x.id === c.key);
        if (c.removed) { if (i >= 0) st.approval_gates.splice(i, 1); dropId(c.key); break; }
        const cur: Gate | undefined = st.approval_gates[i];
        const next: Gate = {
          id: c.key,
          name: str(d.name ?? cur?.name ?? "").trim(),
          approvers: strs(d.approvers) ?? cur?.approvers ?? [],
          rule: str(d.rule ?? cur?.rule ?? ""),
        };
        if (!next.name) { c.problem = "a new gate needs a name"; break; }
        if (i >= 0) st.approval_gates[i] = next; else st.approval_gates.push(next);
        break;
      }
      case "link": {
        const [kf, kt, ky] = c.key.split(">").map((x) => x.trim());
        const from = str(d.from ?? kf).trim();
        const to = str(d.to ?? kt).trim();
        const type = str(d.type ?? ky ?? "hands_off").trim();
        if (!from || !to) { c.problem = "a link's key is from>to>type"; break; }
        if (!EDGE_TYPES.has(type)) { c.problem = `type must be one of ${[...EDGE_TYPES].join(", ")}`; break; }
        const i = st.edges.findIndex((e) => e.from === from && e.to === to && e.type === type);
        if (c.removed) { if (i >= 0) st.edges.splice(i, 1); break; }
        const next: Edge = { from, to, type: type as Edge["type"], label: str(d.label ?? st.edges[i]?.label ?? "") };
        if (i >= 0) st.edges[i] = next; else st.edges.push(next);
        break;
      }
      case "content_team": {
        if (c.removed) { st.content_team = undefined; break; }
        const cur = st.content_team ?? { version: "", updated: "", status: "", doc: "", schedule: [] };
        st.content_team = {
          ...cur,
          version: str(d.version ?? cur.version),
          updated: str(d.updated ?? cur.updated),
          status: str(d.status ?? cur.status),
          doc: str(d.doc ?? cur.doc),
          schedule: Array.isArray(d.schedule) ? d.schedule.filter(isObj).map((x) => ({ when: str(x.when), step: str(x.step) })) : cur.schedule,
        };
        break;
      }
    }
  }
  return st;
}

/** The roster for this request: baseline plus every change from chat. */
export const getTeam = cache(async () => {
  const { changes } = await getChanges();
  return makeTeam(applyRoster(BASE_STRUCTURE, changes));
});

/* ---------- agents ---------- */

const GRADIENTS: [string, string][] = [["#C9A86A", "#F2D9A0"], ["#3FA7B5", "#8FE0D0"], ["#FF5A36", "#FFA24C"], ["#8B7CF6", "#C4B5FD"]];

export const getAgents = cache(async (): Promise<AgentDef[]> => {
  const { changes } = await getChanges();
  const list: AgentDef[] = AGENTS.map((a) => ({ ...a }));
  for (const c of changes) {
    if (c.kind !== "agent" || c.problem) continue;
    const i = list.findIndex((a) => a.id === c.key);
    if (c.removed) { if (i >= 0) list.splice(i, 1); continue; }
    const cur = list[i];
    const d = c.data ?? {};
    const name = str(d.name ?? cur?.name).trim();
    if (!name) { c.problem = "a new agent needs a name"; continue; }
    const g = strs(d.gradient);
    const next: AgentDef = {
      id: c.key,
      name,
      role: str(d.role ?? cur?.role ?? ""),
      published: d.published !== undefined ? d.published === true || d.published === "true" : cur?.published ?? false,
      toolWorkflowIds: strs(d.toolWorkflowIds) ?? cur?.toolWorkflowIds ?? [],
      tables: strs(d.tables) ?? cur?.tables ?? [],
      subAgents: strs(d.subAgents) ?? cur?.subAgents,
      outward: str(d.outward ?? cur?.outward ?? ""),
      gradient: g && g.length === 2 ? [g[0], g[1]] : cur?.gradient ?? GRADIENTS[list.length % GRADIENTS.length],
    };
    if (i >= 0) list[i] = next; else list.push(next);
  }
  return list;
});

/* ---------- content plan ---------- */

const POST_FIELDS = ["date", "slot", "platforms", "format", "pillar", "project", "hook", "concept", "cta", "madeBy"] as const;

export const getPlan = cache(async () => {
  const { changes } = await getChanges();
  const plan: PlannedPost[] = PLAN.map((p) => ({ ...p }));
  const videos: DriveVideo[] = DRIVE_VIDEOS.map((v) => ({ ...v }));
  const meta = { ...PLAN_META, before: PLAN_META.before.map((b) => ({ ...b })) };

  for (const c of changes) {
    if (c.problem) continue;
    const d = c.data ?? {};
    if (c.kind === "post") {
      const [date, ...rest] = c.key.split(" ");
      const slot = rest.join(" ").trim();
      const matches = plan.filter((p) => p.date === date && (!slot || p.slot === slot));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { c.problem = "a post's key is YYYY-MM-DD and its slot, like 2026-12-01 1 pm"; continue; }
      if (!slot && matches.length > 1) { c.problem = "that day has more than one post, so add the slot to the key"; continue; }
      if (c.removed) { for (const m of matches) plan.splice(plan.indexOf(m), 1); continue; }
      const cur = matches[0];
      const next = { ...(cur ?? { date, slot: slot || "1 pm", platforms: "", format: "", pillar: "", project: "", hook: "", concept: "", cta: "", madeBy: "" }) } as PlannedPost;
      for (const f of POST_FIELDS) if (d[f] !== undefined) next[f] = str(d[f]);
      if (cur) plan[plan.indexOf(cur)] = next; else plan.push(next);
    } else if (c.kind === "video") {
      const i = videos.findIndex((v) => v.fileId === c.key);
      if (c.removed) { if (i >= 0) videos.splice(i, 1); continue; }
      const cur = videos[i];
      const next: DriveVideo = {
        fileId: c.key,
        title: str(d.title ?? cur?.title ?? "Draft video"),
        project: str(d.project ?? cur?.project ?? ""),
        note: str(d.note ?? cur?.note ?? ""),
      };
      if (i >= 0) videos[i] = next; else videos.unshift(next);
    } else if (c.kind === "plan") {
      for (const f of ["title", "account", "period", "written", "status"] as const) if (d[f] !== undefined) meta[f] = str(d[f]);
      if (d.docUrl !== undefined) {
        if (/^https:\/\/docs\.google\.com\//.test(str(d.docUrl))) meta.docUrl = str(d.docUrl);
        else c.problem = "docUrl must be a Google Docs link";
      }
      if (Array.isArray(d.before)) meta.before = d.before.filter(isObj).map((b) => ({ item: str(b.item), owner: str(b.owner), why: str(b.why) }));
    }
  }
  plan.sort((a, b) => (a.date === b.date ? slotOrder(a.slot) - slotOrder(b.slot) : a.date.localeCompare(b.date)));
  return { plan, videos, meta };
});

function slotOrder(slot: string): number {
  const m = slot.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!m) return 0;
  return ((Number(m[1]) % 12) + (m[3].toLowerCase() === "pm" ? 12 : 0)) * 60 + Number(m[2] ?? 0);
}

/** The newest changes, for the Overview. Applied after the roster, agents and plan so problems are filled in. */
export async function recentChanges(n = 6): Promise<{ changes: Change[]; error: string | null }> {
  const res = await getChanges();
  await Promise.all([getTeam(), getAgents(), getPlan()]);
  return { changes: [...res.changes].reverse().slice(0, n), error: res.error };
}
