# Agent Desk

Internal dashboard for MRET 1's n8n agents. Glass UI, Next.js 15, Google sign-in limited to an email allowlist.

## What it does
| Page | What you can do |
|---|---|
| Overview | Items waiting on you, live agents and workflows, runs and failures in the last 24h, team activity |
| To-do | Shared list for Nicholas and Dan with a switch to mark each item done. Stored in the n8n data table desk_todos, so it's the same for both of you. |
| Approvals | Read Content Agent edit plans (content_queue) and SEO fix lists (seo_fix_lists); approve or request changes. Approving only updates the row in n8n; nothing is posted. |
| Team | Flow chart of how the agents talk to each other, drawn from the team roster file: you, the Orchestrator, each department's chain of hand-offs, the approval gates (with how many items wait), revisions, data feeds and reports. Live activity from n8n. Outside agents that report in are listed under it. |
| Content | The content pipeline by role, this week's briefs (intent, angle, ask, test), what's in production with video previews, draft cuts in Drive, and the December calendar. |
| Agents | Hiring Manager, Content Agent, SEO Agent: role, tools, tables they write to, activity from their own tool workflows. Below them, outside agents and their recent reports. |
| Workflows | All workflows grouped, live/paused, 7-day runs and success rate. Pause (unpublish) or resume (republishes the last published version, never an unreviewed draft). |
| Runs | Last 7 days of executions, filter by status/agent/workflow, retry failed runs, stop running ones, error detail per run |

## Limits (n8n public API, checked against n8n 2.48.6)
- The API has no endpoints for first-class Agents, so agents can't be run or paused from here and their live/draft status comes from `lib/config.ts` (synced Nov 19). Activity is read from the tool workflows they call.
- "Run now" needs a Webhook trigger on a workflow. None of the current workflows have one.
- No audit log yet.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in:
   - `N8N_BASE_URL`: the n8n instance address
   - `N8N_API_KEY`: n8n > Settings > n8n API. Scopes: workflow:list, workflow:read, workflow:activate, workflow:deactivate, execution:list, execution:read, execution:retry, execution:stop, dataTableRow:read, dataTableRow:create, dataTableRow:update
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Google Cloud OAuth client, redirect URI `https://<your-domain>/api/auth/callback/google`
   - `ALLOWED_EMAILS`: comma-separated Google accounts allowed in
   - `NEXTAUTH_SECRET`: `openssl rand -base64 32`
   - `NEXTAUTH_URL`: the app's public URL
3. `npm run dev` locally, or deploy to Netlify (project agent-desk-mret1) with the same env vars.

`PREVIEW_MODE=1` (local only, ignored on Vercel and Netlify) skips sign-in and runs on a snapshot of the real n8n data from Nov 19, with buttons that change nothing.

## Where to change things
- Team structure: `agent-team/structure.json` (next to this project). `npm run dev` and `npm run build` copy it to `data/team-structure.json` (`scripts/sync-team.mjs`); if it isn't there, the last copy is used. Department colours, which gate feeds which Approvals table, and the content pipeline stages: `lib/structure.ts`
- December content calendar and Drive draft cuts: `lib/content-plan.ts`. Briefs, queue and performance are read live from the content agent's data tables (`CONTENT_SOURCES` in `lib/config.ts`)
- Agents, their tools and approval tables: `lib/config.ts`
- n8n calls: `lib/n8n.ts`
- Look and feel: `app/globals.css`

## Outside agents
An agent that runs outside n8n (a partner's or friend's) never talks to this app directly. It reports in to the n8n workflow **External Agent Intake**, which checks each report and logs it to the `external_agent_events` data table; the desk reads that table (`EXTERNAL_INTAKE` in `lib/config.ts`).

- Send: HTTPS `POST` with JSON to `<n8n address>/webhook/external-agent`, with the agreed header key.
- Required fields: `agent_name`, `task`, `status` (one of `queued`, `working`, `done`, `failed`, `needs_approval`).
- Optional: `summary`, `link` (https only; anything else is dropped), `payload` (any JSON object), `external_ref` (their own id).
- Replies: `200 {"ok":true,"id":...}` when logged, `400` when a field is missing or the status isn't one of the five.
- A report with `needs_approval` shows up in Approvals under "Outside agents". Approving only updates the row; nothing is sent back to the agent.
- The workflow stays off until you switch it on, and the header key is set by you in the n8n credential, never in this code.
