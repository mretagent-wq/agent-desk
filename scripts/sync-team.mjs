// Builds the team structure the app draws, before a build or dev run.
//
// Base: ../agent-team/structure.json, the full roster.
// Overlay: ../agent-team/structure-v2-lean.json, the lean content team. When it is there, it replaces the
// Marketing and content department: roles that aren't in it leave the chart, its hand-offs replace the old
// ones, and links to other teams (the Orchestrator, the Overseer) are kept for roles that stay.
// Overlay roles marked "planned" show as "hiring", since they are being sourced through the Hiring Manager.
//
// If neither file is there (for example on Netlify), the copy already in data/ is used as is.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Next to this project first, then the project's shared folder.
const teamDir = [process.env.AGENT_TEAM_DIR, resolve(root, "../agent-team"), "/mnt/project-files/agent-team"].find(
  (d) => d && existsSync(resolve(d, "structure.json")),
);
const baseFile = teamDir ? resolve(teamDir, "structure.json") : resolve(root, "../agent-team/structure.json");
const leanFile = resolve(teamDir ?? root, "structure-v2-lean.json");
const dest = resolve(root, "data/team-structure.json");
const DEPT = "marketing";

function read(file) {
  const d = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(d.nodes) || !Array.isArray(d.edges)) throw new Error(`${file}: missing nodes or edges`);
  return d;
}

function merge(base, lean) {
  const out = structuredClone(base);
  const dept = out.departments.find((d) => d.id === DEPT);
  if (!dept) throw new Error(`no ${DEPT} department in the base roster`);
  const oldIds = new Set([dept.head, ...dept.members]);
  const gateIds = new Set((lean.approval_gates ?? []).map((g) => g.id));
  const leanRoles = lean.nodes.filter((n) => n.kind !== "human");
  const newIds = new Set(leanRoles.map((n) => n.id));

  // Roles: replace the department's roles with the lean ones, keeping fields the lean file leaves out.
  const prev = new Map(out.nodes.map((n) => [n.id, n]));
  out.nodes = out.nodes.filter((n) => !oldIds.has(n.id) || newIds.has(n.id));
  for (const n of leanRoles) {
    const old = prev.get(n.id) ?? {};
    const status = n.status === "planned" ? "hiring" : n.status;
    const merged = { ...old, ...n, department: DEPT, status, n8n_agent_id: n.n8n_agent_id ?? old.n8n_agent_id ?? null };
    const i = out.nodes.findIndex((x) => x.id === n.id);
    if (i >= 0) out.nodes[i] = merged;
    else out.nodes.push(merged);
  }
  const head = leanRoles.find((n) => n.kind === "head")?.id ?? dept.head;
  dept.head = head;
  dept.members = leanRoles.map((n) => n.id).filter((id) => id !== head);

  // Edges: drop every edge inside the old department (and its gates), and any edge to a role that left.
  const inside = (id) => oldIds.has(id) || newIds.has(id) || gateIds.has(id);
  const ids = new Set(out.nodes.map((n) => n.id));
  const gates = new Set((out.approval_gates ?? []).map((g) => g.id));
  out.edges = out.edges.filter((e) => !(inside(e.from) && inside(e.to)) && (ids.has(e.from) || gates.has(e.from)) && (ids.has(e.to) || gates.has(e.to)));
  out.edges.push(...lean.edges);

  // Gates: take approvers and wording from the lean file, keep the base name.
  for (const g of lean.approval_gates ?? []) {
    const i = out.approval_gates.findIndex((x) => x.id === g.id);
    const merged = { ...(out.approval_gates[i] ?? { id: g.id, name: g.id }), approvers: g.approvers, rule: g.rule ?? g.what ?? out.approval_gates[i]?.rule ?? "" };
    if (i >= 0) out.approval_gates[i] = merged;
    else out.approval_gates.push(merged);
  }

  out.content_team = { version: lean.version, updated: lean.updated, status: lean.status ?? "", doc: lean.doc ?? "", schedule: lean.schedule ?? [] };
  out.version = `${base.version} with ${lean.version}`;
  out.updated = [base.updated, lean.updated].sort().pop();
  return out;
}

if (!existsSync(baseFile)) {
  console.log("sync-team: no agent-team/structure.json found, using data/team-structure.json");
} else {
  try {
    const base = read(baseFile);
    const out = existsSync(leanFile) ? merge(base, read(leanFile)) : base;
    writeFileSync(dest, JSON.stringify(out, null, 1) + "\n");
    console.log(`sync-team: wrote ${out.version} (${out.nodes.length} roles, ${out.edges.length} links)`);
  } catch (e) {
    console.warn(`sync-team: kept the old copy (${e.message})`);
  }
}
