// Preview snapshot is local-only and not shipped.
import type { Execution, Workflow } from "./types";

export const PREVIEW_TAKEN_AT = "2026-11-19T14:40:00Z";
export const PREVIEW_WORKFLOWS: Workflow[] = [];
export const PREVIEW_EXECUTIONS: Execution[] = [];
export const PREVIEW_ERRORS: Record<string, { message: string; node: string; nodes: { name: string; status: string; ms: number }[] }> = {};
