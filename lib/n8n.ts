import "server-only";
import type { Execution, ExecutionDetail, Workflow } from "./types";

/** Thin client for the n8n public API (v1). Runs on the server only; the key never reaches the browser. */

function env() {
  const base = process.env.N8N_BASE_URL?.replace(/\/+$/, "");
  const key = process.env.N8N_API_KEY;
  if (!base || !key) throw new Error("n8n is not connected: N8N_BASE_URL and N8N_API_KEY are not set.");
  return { base, key };
}

export function n8nConfigured() {
  return Boolean(process.env.N8N_BASE_URL && process.env.N8N_API_KEY);
}

async function call<T>(path: string, init: RequestInit & { query?: Record<string, string | undefined> } = {}): Promise<T> {
  const { base, key } = env();
  const url = new URL(`${base}/api/v1${path}`);
  for (const [k, v] of Object.entries(init.query ?? {})) if (v !== undefined && v !== "") url.searchParams.set(k, v);
  const res = await fetch(url, {
    ...init,
    headers: { "X-N8N-API-KEY": key, Accept: "application/json", "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) msg += `: ${body.message}`;
    } catch {}
    throw new Error(`n8n ${init.method ?? "GET"} ${path} failed (${msg})`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

type Page<T> = { data: T[]; nextCursor?: string | null };

async function all<T>(path: string, query: Record<string, string | undefined>, max: number): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | undefined;
  do {
    const page = await call<Page<T>>(path, { query: { ...query, limit: "250", cursor } });
    out.push(...page.data);
    cursor = page.nextCursor ?? undefined;
  } while (cursor && out.length < max);
  return out.slice(0, max);
}

/* ---------- workflows ---------- */

interface RawWorkflow {
  id: string;
  name: string;
  description?: string | null;
  active: boolean;
  activeVersionId?: string | null;
  createdAt: string;
  updatedAt: string;
  triggerCount?: number;
  tags?: { name: string }[];
  isArchived?: boolean;
}

export async function listWorkflows(): Promise<Workflow[]> {
  const rows = await all<RawWorkflow>("/workflows", { excludePinnedData: "true" }, 1000);
  return rows
    .filter((w) => !w.isArchived)
    .map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description ?? null,
      active: w.activeVersionId != null ? true : Boolean(w.active),
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
      triggerCount: w.triggerCount ?? 0,
      tags: (w.tags ?? []).map((t) => t.name),
    }));
}

/** Pause = unpublish. The saved workflow is untouched; it just stops running in production. */
export async function pauseWorkflow(id: string) {
  await call(`/workflows/${encodeURIComponent(id)}/unpublish`, { method: "POST", body: "{}" });
}

/**
 * Resume = republish the most recent *named* (previously published) version, never unreviewed
 * draft edits. Publishing without a versionId would push the latest saved draft live.
 */
export async function lastPublishedVersion(id: string): Promise<{ versionId: string; name: string } | null> {
  const page = await call<Page<{ versionId: string; name: string | null; createdAt: string }>>(
    `/workflows/${encodeURIComponent(id)}/history`,
    { query: { limit: "100" } },
  );
  const named = page.data
    .filter((v) => v.name)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return named ? { versionId: named.versionId, name: named.name as string } : null;
}

export async function resumeWorkflow(id: string): Promise<string> {
  const v = await lastPublishedVersion(id);
  if (!v) throw new Error("No earlier published version found. Publish it from n8n so you can review what goes live.");
  await call(`/workflows/${encodeURIComponent(id)}/publish`, { method: "POST", body: JSON.stringify({ versionId: v.versionId }) });
  return v.name;
}

/* ---------- executions ---------- */

export async function listExecutions(sinceIso: string, max = 500): Promise<Execution[]> {
  const rows = await all<Execution & { id: string | number }>("/executions", { startedAfter: sinceIso, includeData: "false" }, max);
  return rows.map((e) => ({ ...e, id: String(e.id), workflowId: String(e.workflowId) }));
}

interface RawRunData {
  [node: string]: { executionStatus?: string; executionTime?: number; error?: { message?: string } }[];
}

export async function getExecution(id: string): Promise<ExecutionDetail> {
  const raw = await call<
    Execution & {
      id: string | number;
      data?: { resultData?: { error?: { message?: string; node?: { name?: string } }; lastNodeExecuted?: string; runData?: RawRunData } };
    }
  >(`/executions/${encodeURIComponent(id)}`, { query: { includeData: "true" } });
  const rd = raw.data?.resultData;
  const runData = rd?.runData ?? {};
  const nodes = Object.entries(runData).map(([name, runs]) => {
    const last = runs[runs.length - 1] ?? {};
    return { name, status: last.executionStatus ?? (last.error ? "error" : "success"), ms: runs.reduce((s, r) => s + (r.executionTime ?? 0), 0) };
  });
  const errNode = nodes.find((n) => n.status === "error")?.name ?? rd?.error?.node?.name ?? null;
  return {
    id: String(raw.id),
    workflowId: String(raw.workflowId),
    status: raw.status,
    mode: raw.mode,
    startedAt: raw.startedAt,
    stoppedAt: raw.stoppedAt,
    retryOf: raw.retryOf ?? null,
    errorMessage: rd?.error?.message ?? null,
    errorNode: errNode,
    lastNode: rd?.lastNodeExecuted ?? null,
    nodes,
  };
}

export async function retryExecution(id: string) {
  await call(`/executions/${encodeURIComponent(id)}/retry`, { method: "POST", body: JSON.stringify({ loadWorkflow: true }) });
}

export async function stopExecution(id: string) {
  await call(`/executions/${encodeURIComponent(id)}/stop`, { method: "POST", body: "{}" });
}

/* ---------- data tables ---------- */

export type Row = Record<string, unknown> & { id: number; createdAt?: string };

export async function listRows(tableId: string, max = 250): Promise<Row[]> {
  return all<Row>(`/data-tables/${encodeURIComponent(tableId)}/rows`, { sortBy: "createdAt:desc" }, max);
}

export async function updateRow(tableId: string, rowId: number, data: Record<string, unknown>) {
  await call(`/data-tables/${encodeURIComponent(tableId)}/rows/update`, {
    method: "PATCH",
    body: JSON.stringify({ filter: { type: "and", filters: [{ columnName: "id", condition: "eq", value: rowId }] }, data }),
  });
}

export async function insertRow(tableId: string, data: Record<string, unknown>) {
  await call(`/data-tables/${encodeURIComponent(tableId)}/rows`, {
    method: "POST",
    body: JSON.stringify({ data: [data], returnType: "count" }),
  });
}

/** Update only rows that match every column/value pair, e.g. { id: 4, owner: "a@b.com" }. */
export async function updateRowWhere(tableId: string, match: Record<string, string | number>, data: Record<string, unknown>) {
  await call(`/data-tables/${encodeURIComponent(tableId)}/rows/update`, {
    method: "PATCH",
    body: JSON.stringify({
      filter: { type: "and", filters: Object.entries(match).map(([columnName, value]) => ({ columnName, condition: "eq", value })) },
      data,
    }),
  });
}
