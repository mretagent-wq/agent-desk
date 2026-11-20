import type { AgentDef } from "./types";

/**
 * The n8n public API (checked against n8n 2.48.6) has no endpoints for first-class Agents,
 * so the team is listed here. IDs come from the n8n instance. When an agent is added or
 * published in n8n, update this list.
 */
export const AGENTS_SYNCED_AT = "2026-11-19T14:40:00Z";

export const AGENTS: AgentDef[] = [
  {
    id: "SBV7uj3qQmeix4TS",
    name: "Hiring Manager",
    role: "Finds open-source agents on GitHub, safety-scans them, recommends hires and hands work to the team.",
    published: true,
    toolWorkflowIds: ["wzEIP8qhKWO1BKu6", "BzRsxXtJI9isjmV7"],
    tables: ["Agent department roster"],
    subAgents: ["10dJtM9xXNJyF7Xy", "DQTeX0zXZXN382n9"],
    outward: "Records a hire only after your yes. Never installs anything.",
    gradient: ["#FF5A36", "#FFA24C"],
  },
  {
    id: "10dJtM9xXNJyF7Xy",
    name: "Content Agent",
    role: "Plans Reels from Dan's Dropbox footage, fact-checks prices and milestones, saves edit plans for approval.",
    published: true,
    toolWorkflowIds: ["177ZfVRNuU1IYo8q", "Y62V29SQzxZ7m0vO", "vUVCZKPCUIXEINrM"],
    tables: ["content_queue", "footage_shot_log"],
    outward: "Never posts. Every plan waits in the content queue.",
    gradient: ["#C9A86A", "#F2D9A0"],
  },
  {
    id: "DQTeX0zXZXN382n9",
    name: "SEO Agent",
    role: "Audits Dan's project sites for SEO, speed and broken pages, and ranks fixes.",
    published: false,
    toolWorkflowIds: ["ny0Kn4TfRrgeeHKD", "vUVCZKPCUIXEINrM"],
    tables: ["seo_audits", "seo_fix_lists", "monitored_sites"],
    outward: "Never changes a site. Fix lists wait for approval.",
    gradient: ["#3FA7B5", "#8FE0D0"],
  },
];

export interface ApprovalSource {
  id: string;
  label: string;
  tableId: string;
  titleCol: string;
  projectCol?: string;
  statusCol: string;
  /** Status values that mean "waiting on a person". Empty string = blank cell. */
  pending: string[];
  approveValue: string;
  rejectValue: string;
  decidedAtCol?: string;
  summaryCol?: string;
  linkCol?: string;
  fields: { col: string; label: string; long?: boolean }[];
}

export const APPROVAL_SOURCES: ApprovalSource[] = [
  {
    id: "content_queue",
    label: "Content queue",
    tableId: "261kk1R9klkNFRnD",
    titleCol: "title",
    projectCol: "project",
    statusCol: "status",
    pending: ["awaiting_render", "awaiting_approval", "ready_for_review", "pending_approval"],
    approveValue: "approved",
    rejectValue: "changes_requested",
    summaryCol: "usp",
    linkCol: "drive_link",
    fields: [
      { col: "format", label: "Format" },
      { col: "hook", label: "Hook" },
      { col: "caption", label: "Caption", long: true },
      { col: "hashtags", label: "Hashtags" },
      { col: "script", label: "Shot list", long: true },
      { col: "claims_and_sources", label: "Claims and sources", long: true },
      { col: "reviewer_notes", label: "Agent's notes for you", long: true },
    ],
  },
  {
    id: "external_agents",
    label: "Outside agents",
    tableId: "qAAikuaVoXJeVAeg",
    titleCol: "task",
    projectCol: "agent_name",
    statusCol: "status",
    pending: ["needs_approval"],
    approveValue: "approved",
    rejectValue: "rejected",
    summaryCol: "summary",
    linkCol: "link",
    fields: [
      { col: "agent_name", label: "Agent" },
      { col: "external_ref", label: "Their reference" },
      { col: "payload", label: "Details they sent", long: true },
    ],
  },
  {
    id: "seo_fix_lists",
    label: "SEO fix lists",
    tableId: "GchJCaTtpAviviBa",
    titleCol: "site_url",
    statusCol: "decision",
    pending: [""],
    approveValue: "approved",
    rejectValue: "rejected",
    decidedAtCol: "decided_at",
    fields: [
      { col: "week_of", label: "Week of" },
      { col: "fix_list", label: "Fix list", long: true },
    ],
  },
];

export const WORKFLOW_GROUPS: { match: RegExp; label: string }[] = [
  { match: /^Hiring Manager tool/i, label: "Hiring Manager" },
  { match: /^Content tool|^Content Agent/i, label: "Content" },
  { match: /^SEO tool|Site Check/i, label: "SEO" },
  { match: /^Tool:/i, label: "Shared tools" },
  { match: /^Dan Maza PA|FUB|Lead|Missed Calls|Twilio/i, label: "Leads and calls" },
  { match: /^Utility|^Test|^ZZ|Key Test/i, label: "Utilities and tests" },
];

export function groupOf(name: string): string {
  return WORKFLOW_GROUPS.find((g) => g.match.test(name))?.label ?? "Other";
}

/**
 * Agents that live outside n8n report in through the "External Agent Intake" workflow, which logs every report
 * to this table. The dashboard reads it; nothing here can call an outside agent.
 */
export const EXTERNAL_INTAKE = {
  tableId: "qAAikuaVoXJeVAeg",
  workflowId: "v1KvYEINVI3u0iuf",
  /** Rows with these agent names are test reports and are hidden. */
  hideAgents: ["Setup test (delete me)"],
};

/** Content data the Content page reads. Read only, except approvals, which go through the Approvals page. */
export const CONTENT_SOURCES = {
  briefsTableId: "KpjfRSKtIDJ2yNP6",
  queueTableId: "261kk1R9klkNFRnD",
  performanceTableId: "EMuB9ra7oy4D6wwR",
};

/** The To-do list. Rows live in the n8n data table desk_todos (title, note, done, done_at, added_by). */
export const TODOS = { tableId: "iHYq8K0rxweANg0W" };
