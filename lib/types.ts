export type ExecStatus =
  | "canceled"
  | "crashed"
  | "error"
  | "new"
  | "running"
  | "success"
  | "unknown"
  | "waiting";

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  triggerCount: number;
  tags: string[];
}

export interface Execution {
  id: string;
  workflowId: string;
  status: ExecStatus;
  mode: string;
  startedAt: string;
  stoppedAt: string | null;
  retryOf?: string | null;
}

export interface ExecutionDetail extends Execution {
  errorMessage: string | null;
  errorNode: string | null;
  lastNode: string | null;
  nodes: { name: string; status: string; ms: number }[];
}

export interface AgentDef {
  id: string;
  name: string;
  role: string;
  published: boolean;
  /** Workflows the agent calls as tools. Their runs are the agent's visible activity. */
  toolWorkflowIds: string[];
  /** Data tables the agent writes to. */
  tables: string[];
  subAgents?: string[];
  outward: string;
  gradient: [string, string];
}

export interface ApprovalField {
  label: string;
  value: string;
  long?: boolean;
}

export interface ApprovalItem {
  key: string;
  sourceId: string;
  sourceLabel: string;
  rowId: number;
  title: string;
  project: string;
  status: string;
  createdAt: string;
  summary: string;
  fields: ApprovalField[];
  link: string | null;
}

export interface ExternalEvent {
  id: number;
  agent: string;
  task: string;
  status: string;
  summary: string;
  link: string;
  ref: string;
  at: string;
}

export interface Snapshot {
  mode: "live" | "preview";
  takenAt: string;
  n8nBaseUrl: string | null;
  workflows: Workflow[];
  executions: Execution[];
  approvals: ApprovalItem[];
  external: ExternalEvent[];
  errors: string[];
}
