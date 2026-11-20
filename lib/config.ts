import type { AgentDef } from "./types";

/**
 * The n8n public API (checked against n8n 2.48.6) has no endpoints for first-class Agents,
 * so the team is listed here, read from the n8n instance. When an agent is added or published
 * in n8n, update this list (or add an "agent" row to desk_changes, see lib/live.ts).
 */
export const AGENTS_SYNCED_AT = "2026-11-20T14:22:00Z";

/** How the Agents page groups the team, in this order. */
export const AGENT_CATEGORIES: { id: string; label: string; blurb: string }[] = [
  { id: "command", label: "Command", blurb: "Runs the team: hires agents and answers questions about the work." },
  { id: "content", label: "Content team", blurb: "Dan's social pipeline, in the order a post moves through it. Nicholas and Dan approve every post." },
  { id: "sites", label: "Websites and SEO", blurb: "Checks Dan's project sites." },
];

const CONTENT_GRADIENT: [string, string] = ["#1E3A8A", "#C9A227"];

export const AGENTS: AgentDef[] = [
  {
    id: "SBV7uj3qQmeix4TS",
    name: "Hiring Manager",
    category: "command",
    role: "Finds open-source agents on GitHub, safety-scans them, recommends hires and hands work to the team.",
    published: true,
    toolWorkflowIds: ["wzEIP8qhKWO1BKu6", "BzRsxXtJI9isjmV7"],
    tables: ["Agent department roster"],
    subAgents: ["10dJtM9xXNJyF7Xy", "DQTeX0zXZXN382n9"],
    outward: "Records a hire only after your yes. Never installs anything.",
    gradient: ["#FF5A36", "#FFA24C"],
  },
  {
    id: "ge5P1HLaR1GrM0JE",
    name: "Team Brain (voice)",
    category: "command",
    role: "Answers Nicholas out loud about the team, projects, plans and results, from the shared tables.",
    published: true,
    toolWorkflowIds: [],
    tables: ["team_knowledge (dictated notes only)"],
    outward: "Reads only. Saves a note only when you ask it to. $5 a month cap.",
    gradient: ["#0C285A", "#BC955C"],
  },
  {
    id: "x1UKbOROpIYc2gIz",
    name: "Marketing Strategist",
    category: "content",
    role: "Decides what gets made, for whom and when, and writes the weekly briefs and the monthly plan.",
    published: true,
    toolWorkflowIds: ["vUVCZKPCUIXEINrM"],
    tables: ["strategy_briefs"],
    outward: "Plans only. Never posts.",
    gradient: ["#0C285A", "#BC955C"],
  },
  {
    id: "TL4kEEJ6sCpEe5om",
    name: "Platform Strategist",
    category: "content",
    role: "Turns each brief into an Instagram spec: length, slot, hook formula, cover, hashtags and CTA.",
    published: true,
    toolWorkflowIds: [],
    tables: ["strategy_briefs"],
    outward: "Plans only. Never posts.",
    gradient: CONTENT_GRADIENT,
  },
  {
    id: "v0PiA0gSXIz2vA8m",
    name: "Copywriter",
    category: "content",
    role: "Writes hooks, on-screen cards, the caption and CTA in Dan's calm advisor voice, and lists every claim.",
    published: true,
    toolWorkflowIds: [],
    tables: ["strategy_briefs"],
    outward: "Never posts. Every fact goes to the accuracy check.",
    gradient: CONTENT_GRADIENT,
  },
  {
    id: "10dJtM9xXNJyF7Xy",
    name: "Content Agent",
    category: "content",
    role: "Plans Reels from Dan's Dropbox footage, fact-checks prices and milestones, saves edit plans for approval.",
    published: true,
    toolWorkflowIds: ["177ZfVRNuU1IYo8q", "Y62V29SQzxZ7m0vO", "vUVCZKPCUIXEINrM"],
    tables: ["content_queue"],
    outward: "Never posts. Every plan waits in the content queue.",
    gradient: ["#C9A86A", "#F2D9A0"],
  },
  {
    id: "bvLb8cj9tdZOwzGC",
    name: "Sound Designer",
    category: "content",
    role: "Adds the audio plan to each video: mood, BPM, cuts on the beat, the licensed track and levels.",
    published: true,
    toolWorkflowIds: [],
    tables: ["content_queue"],
    outward: "Plans only. Licensed or free music only.",
    gradient: CONTENT_GRADIENT,
  },
  {
    id: "zGxGyliQXwwodOO2",
    name: "Editor",
    category: "content",
    role: "Re-checks every claim at its source and scores each piece; sends exact fixes back or passes it.",
    published: true,
    toolWorkflowIds: ["Y62V29SQzxZ7m0vO", "vUVCZKPCUIXEINrM"],
    tables: ["content_queue"],
    outward: "Never approves for posting. Only you and Dan do.",
    gradient: CONTENT_GRADIENT,
  },
  {
    id: "ymtbfCusbQV2L7st",
    name: "Poster",
    category: "content",
    role: "Prepares the schedule for pieces you and Dan both approved: slot, final caption, cover and checklist.",
    published: true,
    hold: "Posting on hold",
    toolWorkflowIds: [],
    tables: ["content_queue"],
    outward: "Posting hold is on, and it has no tool that can post. Nothing goes out until you lift it.",
    gradient: CONTENT_GRADIENT,
  },
  {
    id: "DQTeX0zXZXN382n9",
    name: "SEO Agent",
    category: "sites",
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

/**
 * Changes made from chat. Any session adds a row to the n8n data table desk_changes and the dashboard applies it on
 * the next page load, with no redeploy. Columns and kinds are described in lib/live.ts and LIVE-CHANGES.md.
 */
export const LIVE_CHANGES = { tableId: "0dsAJYFlmQ3E319R" };

/**
 * Who can sign in, with name, title and role. Rows live in the n8n data table desk_users
 * (email, name, title, role, active, photo_url). Adding a row lets that Google account in on its next sign-in.
 * Admin rights come only from the ADMIN_EMAILS setting in Netlify; a row's role column alone never makes anyone admin.
 */
export const USERS = { tableId: "UvCPXRGHN5UT6TGG" };

/**
 * Private to-do lists, one per admin. Rows live in the n8n data table desk_private_todos
 * (owner, title, note, done, done_at, removed). Read and changed only by the owner's admin login, on the server.
 */
export const PRIVATE_TODOS = { tableId: "ug6WcKMpoy3j5YKS" };
