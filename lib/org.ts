import "server-only";
import raw from "@/data/org.json";
import { getAgents, getChanges } from "./live";

/**
 * The whole org for the Team page: every role, person or agent, in every department.
 *
 * data/org.json is the baseline from the Agent Desk Hub Blueprint. It holds no amounts or private details,
 * because this repo is public. Anything that changes or is private (status once an agent is built, its n8n id,
 * its monthly cap, its schedule) comes from rows in the n8n table desk_changes with kind "org_role" and the
 * role id as item_key, read on every page load. Published state also follows the agent list.
 */

export type OrgStatus = "live" | "draft" | "planned" | "hire" | "person" | "outside" | "confirm";
export type OrgType = "person" | "agent" | "outside";

export interface OrgRole {
  id: string;
  title: string;
  name?: string;
  dept: string;
  type: OrgType;
  status: OrgStatus;
  does: string;
  reportsTo: string[];
  handsTo: string[];
  head?: boolean;
  group?: string;
  n8n?: string;
  owner?: string;
  schedule?: string;
  inputs?: string;
  approval?: string;
  more?: string;
  /** Monthly spend cap in US dollars. Only ever set from desk_changes, never in code. */
  cap?: number;
  model?: string;
  tools?: string[];
  /** Profile photo, set only from desk_changes as "desk:<photo_key>"; served by /api/photo to signed-in people. */
  photo?: string;
}

export interface OrgDept { id: string; name: string; head: string | null; stage: string }
export interface Org { version: string; updated: string; departments: OrgDept[]; roles: OrgRole[]; problems: string[] }

const BASE = raw as unknown as { version: string; updated: string; departments: OrgDept[]; roles: OrgRole[] };
const STATUSES = new Set(["live", "draft", "planned", "hire", "person", "outside", "confirm"]);
const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const list = (v: unknown) => (Array.isArray(v) ? v.map(s).filter(Boolean) : typeof v === "string" ? v.split(/[,\s]+/).filter(Boolean) : undefined);

export async function getOrg(): Promise<Org> {
  const [{ changes }, agents] = await Promise.all([getChanges(), getAgents()]);
  const roles: OrgRole[] = structuredClone(BASE.roles);
  const departments: OrgDept[] = structuredClone(BASE.departments);
  const problems: string[] = [];

  for (const c of changes) {
    if (c.problem) continue;
    if (c.kind === "org_dept") {
      const i = departments.findIndex((d) => d.id === c.key);
      if (c.removed) { if (i >= 0) departments.splice(i, 1); continue; }
      const d = c.data ?? {};
      const next: OrgDept = { id: c.key, name: s(d.name ?? departments[i]?.name ?? c.key), head: d.head !== undefined ? s(d.head) || null : departments[i]?.head ?? null, stage: s(d.stage ?? departments[i]?.stage ?? "") };
      if (i >= 0) departments[i] = next; else departments.push(next);
      continue;
    }
    if (c.kind !== "org_role") continue;
    const i = roles.findIndex((r) => r.id === c.key);
    if (c.removed) { if (i >= 0) roles.splice(i, 1); continue; }
    const d = c.data ?? {};
    const cur = roles[i];
    if (!cur && (!d.title || !d.dept)) { c.problem = "a new org role needs a title and a dept"; problems.push(`${c.key}: ${c.problem}`); continue; }
    const status = s(d.status ?? cur?.status ?? "planned");
    if (!STATUSES.has(status)) { c.problem = `status must be one of ${[...STATUSES].join(", ")}`; problems.push(`${c.key}: ${c.problem}`); continue; }
    const next: OrgRole = {
      ...(cur ?? { id: c.key, title: "", dept: "", type: "agent", status: "planned", does: "", reportsTo: [], handsTo: [] }),
      ...Object.fromEntries(Object.entries(d).filter(([k]) => ["title", "name", "dept", "type", "does", "group", "n8n", "owner", "schedule", "inputs", "approval", "more", "model"].includes(k)).map(([k, v]) => [k, s(v)])),
      status: status as OrgStatus,
    };
    if (d.reportsTo !== undefined) next.reportsTo = list(d.reportsTo) ?? [];
    if (d.handsTo !== undefined) next.handsTo = list(d.handsTo) ?? [];
    if (d.tools !== undefined) next.tools = list(d.tools);
    if (d.head !== undefined) next.head = d.head === true || d.head === "true";
    if (d.photo !== undefined) {
      const m = /^desk:([a-z0-9_-]{1,40})$/i.exec(s(d.photo));
      if (m) next.photo = `/api/photo/${m[1]}`; else delete next.photo;
    }
    if (d.cap !== undefined) { const n = Number(d.cap); if (Number.isFinite(n) && n > 0) next.cap = n; else delete next.cap; }
    if (i >= 0) roles[i] = next; else roles.push(next);
  }

  // Published state follows the agent list: a role whose agent is published is live.
  for (const r of roles) {
    const a = r.n8n ? agents.find((x) => x.id === r.n8n) : undefined;
    if (a?.published && (r.status === "draft" || r.status === "planned" || r.status === "hire")) r.status = "live";
  }
  const ids = new Set(roles.map((r) => r.id));
  for (const r of roles) {
    r.reportsTo = r.reportsTo.filter((x) => ids.has(x));
    r.handsTo = r.handsTo.filter((x) => ids.has(x));
  }
  return { version: BASE.version, updated: BASE.updated, departments, roles, problems };
}
