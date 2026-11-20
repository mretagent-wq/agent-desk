import "server-only";
import { APPROVAL_SOURCES, CONTENT_SOURCES, EXTERNAL_INTAKE, PRIVATE_TODOS, TODOS, type ApprovalSource } from "./config";
import { isPreview } from "./mode";
import * as n8n from "./n8n";
import type { Row } from "./n8n";
import { PREVIEW_ERRORS, PREVIEW_EXECUTIONS, PREVIEW_TAKEN_AT, PREVIEW_WORKFLOWS } from "./preview-workflows";
import { PREVIEW_ROWS } from "./preview-rows";
import type { ApprovalItem, ExecutionDetail, ExternalEvent, Snapshot } from "./types";

/* ---------- preview store (local only, resets on restart) ---------- */

type PreviewStore = { active: Map<string, boolean>; decisions: Map<string, string>; todos?: Map<number, boolean>; added?: Row[]; mine?: Row[] };
const g = globalThis as unknown as { __previewStore?: PreviewStore };
const store: PreviewStore = (g.__previewStore ??= { active: new Map(), decisions: new Map() });

/* ---------- helpers ---------- */

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

function toApprovals(source: ApprovalSource, rows: Row[], base: string | null): ApprovalItem[] {
  return rows
    .filter((r) => source.pending.includes(str(r[source.statusCol])))
    .map((r) => ({
      key: `${source.id}:${r.id}`,
      sourceId: source.id,
      sourceLabel: source.label,
      rowId: r.id,
      title: str(r[source.titleCol]) || `Row ${r.id}`,
      project: source.projectCol ? str(r[source.projectCol]) : "",
      status: str(r[source.statusCol]) || "pending",
      createdAt: str(r.createdAt),
      summary: source.summaryCol ? str(r[source.summaryCol]) : "",
      fields: source.fields
        .map((f) => ({ label: f.label, value: str(r[f.col]), long: f.long }))
        .filter((f) => f.value),
      link: (source.linkCol && str(r[source.linkCol])) || (base ? `${base}/home/datatables` : null),
    }));
}

function toExternal(rows: Row[]): ExternalEvent[] {
  return rows
    .filter((r) => !EXTERNAL_INTAKE.hideAgents.includes(str(r.agent_name)))
    .map((r) => ({
      id: r.id,
      agent: str(r.agent_name),
      task: str(r.task),
      status: str(r.status),
      summary: str(r.summary),
      link: /^https:\/\//.test(str(r.link)) ? str(r.link) : "",
      ref: str(r.external_ref),
      at: str(r.received_at) || str(r.createdAt),
    }));
}

/* ---------- snapshot ---------- */

export async function getSnapshot(): Promise<Snapshot> {
  if (isPreview()) {
    const workflows = PREVIEW_WORKFLOWS.map((w) => ({ ...w, active: store.active.get(w.id) ?? w.active }));
    const approvals = APPROVAL_SOURCES.flatMap((s) => {
      const rows = (PREVIEW_ROWS[s.tableId] ?? []).map((r) => {
        const d = store.decisions.get(`${s.id}:${r.id}`);
        return d ? { ...r, [s.statusCol]: d } : r;
      });
      return toApprovals(s, rows, null);
    });
    const external = toExternal(PREVIEW_ROWS[EXTERNAL_INTAKE.tableId] ?? []);
    return { mode: "preview", takenAt: PREVIEW_TAKEN_AT, n8nBaseUrl: null, workflows, executions: PREVIEW_EXECUTIONS, approvals, external, errors: [] };
  }

  const base = process.env.N8N_BASE_URL?.replace(/\/+$/, "") ?? null;
  const errors: string[] = [];
  if (!n8n.n8nConfigured()) {
    return { mode: "live", takenAt: new Date().toISOString(), n8nBaseUrl: base, workflows: [], executions: [], approvals: [], external: [], errors: ["n8n is not connected yet. Add N8N_BASE_URL and N8N_API_KEY."] };
  }
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  // The approvals table for outside agents is the intake log itself, so it is read once and used for both.
  const tableIds = [...new Set([...APPROVAL_SOURCES.map((s) => s.tableId), EXTERNAL_INTAKE.tableId])];
  const [wf, ex, ...rowSets] = await Promise.allSettled([
    n8n.listWorkflows(),
    n8n.listExecutions(since),
    ...tableIds.map((id) => n8n.listRows(id)),
  ]);
  const pick = <T,>(r: PromiseSettledResult<T>, fallback: T): T => {
    if (r.status === "fulfilled") return r.value;
    errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
    return fallback;
  };
  const rows = new Map(tableIds.map((id, i) => [id, pick(rowSets[i] as PromiseSettledResult<Row[]>, [])]));
  const approvals = APPROVAL_SOURCES.flatMap((s) => toApprovals(s, rows.get(s.tableId) ?? [], base));
  return {
    mode: "live",
    takenAt: new Date().toISOString(),
    n8nBaseUrl: base,
    workflows: pick(wf, []),
    executions: pick(ex, []),
    approvals,
    external: toExternal(rows.get(EXTERNAL_INTAKE.tableId) ?? []),
    errors,
  };
}

/* ---------- content ---------- */

export interface ContentData {
  briefs: Row[];
  queue: Row[];
  performance: Row[];
  errors: string[];
}

export async function getContent(): Promise<ContentData> {
  const ids = [CONTENT_SOURCES.briefsTableId, CONTENT_SOURCES.queueTableId, CONTENT_SOURCES.performanceTableId];
  if (isPreview()) {
    const [briefs, queue, performance] = ids.map((id) => (PREVIEW_ROWS[id] ?? []).map((r) => {
      const d = store.decisions.get(`content_queue:${r.id}`);
      return id === CONTENT_SOURCES.queueTableId && d ? { ...r, status: d } : r;
    }));
    return { briefs, queue, performance, errors: [] };
  }
  if (!n8n.n8nConfigured()) return { briefs: [], queue: [], performance: [], errors: ["n8n is not connected yet."] };
  const errors: string[] = [];
  const res = await Promise.allSettled(ids.map((id) => n8n.listRows(id, 500)));
  const [briefs, queue, performance] = res.map((r) => {
    if (r.status === "fulfilled") return r.value;
    errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
    return [] as Row[];
  });
  return { briefs, queue, performance, errors };
}

export async function getExecutionDetail(id: string): Promise<ExecutionDetail | null> {
  if (isPreview()) {
    const e = PREVIEW_EXECUTIONS.find((x) => x.id === id);
    if (!e) return null;
    const err = PREVIEW_ERRORS[id];
    return { ...e, errorMessage: err?.message ?? null, errorNode: err?.node ?? null, lastNode: err?.node ?? null, nodes: err?.nodes ?? [] };
  }
  return n8n.getExecution(id);
}

/* ---------- writes ---------- */

export async function pause(id: string) {
  if (isPreview()) return void store.active.set(id, false);
  await n8n.pauseWorkflow(id);
}

export async function resume(id: string): Promise<string> {
  if (isPreview()) {
    store.active.set(id, true);
    return "last published version";
  }
  return n8n.resumeWorkflow(id);
}

export async function retry(id: string) {
  if (isPreview()) return;
  await n8n.retryExecution(id);
}

export async function stop(id: string) {
  if (isPreview()) return;
  await n8n.stopExecution(id);
}

export async function decide(sourceId: string, rowId: number, decision: "approve" | "reject") {
  const s = APPROVAL_SOURCES.find((x) => x.id === sourceId);
  if (!s) throw new Error("Unknown approval source.");
  const value = decision === "approve" ? s.approveValue : s.rejectValue;
  if (isPreview()) return void store.decisions.set(`${s.id}:${rowId}`, value);
  const data: Record<string, unknown> = { [s.statusCol]: value };
  if (s.decidedAtCol) data[s.decidedAtCol] = new Date().toISOString();
  await n8n.updateRow(s.tableId, rowId, data);
}

/* ---------- to-do ---------- */

export interface Todo { id: number; title: string; note: string; done: boolean; doneAt: string | null; by: string; at: string }

function toTodo(r: Row): Todo {
  const done = r.done === true || r.done === "true";
  return {
    id: r.id,
    title: String(r.title ?? "").trim(),
    note: String(r.note ?? "").trim(),
    done,
    doneAt: r.done_at ? String(r.done_at) : null,
    by: String(r.added_by ?? ""),
    at: String(r.createdAt ?? ""),
  };
}

export async function getTodos(): Promise<{ todos: Todo[]; error: string | null }> {
  if (isPreview()) {
    store.todos ??= new Map();
    const rows = [...(store.added ?? []), ...(PREVIEW_ROWS[TODOS.tableId] ?? [])];
    return { todos: rows.map((r) => ({ ...toTodo(r), done: store.todos!.get(r.id) ?? toTodo(r).done })), error: null };
  }
  if (!n8n.n8nConfigured()) return { todos: [], error: "n8n isn't connected yet." };
  try {
    return { todos: (await n8n.listRows(TODOS.tableId, 500)).map(toTodo).filter((t) => t.title), error: null };
  } catch (e) {
    return { todos: [], error: e instanceof Error ? e.message : "Couldn't read the to-do list." };
  }
}

export async function setTodo(id: number, done: boolean) {
  if (isPreview()) return void (store.todos ??= new Map()).set(id, done);
  await n8n.updateRow(TODOS.tableId, id, { done, done_at: done ? new Date().toISOString() : null });
}

export async function addTodo(title: string, note: string, by: string) {
  if (isPreview()) {
    store.added ??= [];
    store.added.unshift({ id: 100000 + store.added.length, title, note, done: false, added_by: by, createdAt: new Date().toISOString() });
    return;
  }
  await n8n.insertRow(TODOS.tableId, { title, note, done: false, added_by: by });
}

/* ---------- private to-do (admin only; the caller checks the role) ---------- */

const truthy = (v: unknown) => v === true || v === "true";

/** Made-up rows for local preview only. Real items live only in n8n. */
function previewMine(owner: string): Row[] {
  return (store.mine ??= [
    { id: 1, owner, title: "Example private item", note: "Only the admin login sees this list.", done: false, removed: false, createdAt: new Date().toISOString() },
    { id: 2, owner, title: "Another example", note: "", done: true, done_at: new Date().toISOString(), removed: false, createdAt: new Date().toISOString() },
  ]);
}

export async function getPrivateTodos(owner: string): Promise<{ todos: Todo[]; error: string | null }> {
  const mine = (rows: Row[]) =>
    rows
      .filter((r) => String(r.owner ?? "").trim().toLowerCase() === owner && !truthy(r.removed))
      .map(toTodo)
      .filter((t) => t.title);
  if (isPreview()) return { todos: mine(previewMine(owner)), error: null };
  if (!n8n.n8nConfigured()) return { todos: [], error: "n8n isn't connected yet." };
  try {
    return { todos: mine(await n8n.listRows(PRIVATE_TODOS.tableId, 1000)), error: null };
  } catch (e) {
    return { todos: [], error: e instanceof Error ? e.message : "Couldn't read your list." };
  }
}

export async function addPrivateTodo(owner: string, title: string, note: string) {
  if (isPreview()) {
    const rows = previewMine(owner);
    rows.unshift({ id: 1000 + rows.length, owner, title, note, done: false, removed: false, createdAt: new Date().toISOString() });
    return;
  }
  await n8n.insertRow(PRIVATE_TODOS.tableId, { owner, title, note, done: false, removed: false });
}

export async function setPrivateTodo(owner: string, id: number, done: boolean) {
  const data = { done, done_at: done ? new Date().toISOString() : null };
  if (isPreview()) return void Object.assign(previewMine(owner).find((r) => r.id === id) ?? {}, data);
  await n8n.updateRowWhere(PRIVATE_TODOS.tableId, { id, owner }, data);
}

/** Takes the item off the list. The row is kept in n8n, marked removed. */
export async function removePrivateTodo(owner: string, id: number) {
  if (isPreview()) return void Object.assign(previewMine(owner).find((r) => r.id === id) ?? {}, { removed: true });
  await n8n.updateRowWhere(PRIVATE_TODOS.tableId, { id, owner }, { removed: true });
}
