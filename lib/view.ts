import "server-only";
import { cache } from "react";
import { AGENTS } from "./config";
import { getContent, getSnapshot } from "./data";
import type { Execution, Snapshot, Workflow } from "./types";

export const snapshot = cache(getSnapshot);
export const content = cache(getContent);

/** "Now" for relative times. Preview pins it to the snapshot so the numbers match what was read. */
export function nowFor(s: Snapshot): number {
  return s.mode === "preview" ? new Date(s.takenAt).getTime() : Date.now();
}

export interface WfStats { runs24: number; fails24: number; runs7: number; fails7: number; last: Execution | null }

export function statsByWorkflow(s: Snapshot): Map<string, WfStats> {
  const now = nowFor(s);
  const m = new Map<string, WfStats>();
  for (const w of s.workflows) m.set(w.id, { runs24: 0, fails24: 0, runs7: 0, fails7: 0, last: null });
  for (const e of s.executions) {
    const st = m.get(e.workflowId) ?? { runs24: 0, fails24: 0, runs7: 0, fails7: 0, last: null };
    const age = now - new Date(e.startedAt).getTime();
    const failed = e.status === "error" || e.status === "crashed";
    st.runs7++;
    if (failed) st.fails7++;
    if (age < 86400000) { st.runs24++; if (failed) st.fails24++; }
    if (!st.last || e.startedAt > st.last.startedAt) st.last = e;
    m.set(e.workflowId, st);
  }
  return m;
}

export function agentsUsing(workflowId: string): string[] {
  return AGENTS.filter((a) => a.published && a.toolWorkflowIds.includes(workflowId)).map((a) => a.name);
}

export function wfName(s: Snapshot, id: string): string {
  return s.workflows.find((w: Workflow) => w.id === id)?.name ?? `Workflow ${id}`;
}

export function n8nLink(s: Snapshot, path: string): string | null {
  return s.n8nBaseUrl ? `${s.n8nBaseUrl}${path}` : null;
}

/** A tool shared by several agents can't be credited to one of them, so counts use each agent's own tools only. */
export function isShared(workflowId: string): boolean {
  return AGENTS.filter((a) => a.toolWorkflowIds.includes(workflowId)).length > 1;
}

export function agentActivity(toolIds: string[], stats: Map<string, WfStats>) {
  const own = toolIds.filter((id) => !isShared(id));
  const sum = (k: keyof Omit<WfStats, "last">) => own.reduce((n, id) => n + (stats.get(id)?.[k] ?? 0), 0);
  const last = own.map((id) => stats.get(id)?.last?.startedAt).filter((x): x is string => Boolean(x)).sort().pop() ?? null;
  return { runs24: sum("runs24"), runs7: sum("runs7"), fails7: sum("fails7"), last };
}
