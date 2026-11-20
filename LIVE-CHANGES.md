# Changing Agent Desk from chat

Agent Desk reads the n8n data table **desk_changes** (id `0dsAJYFlmQ3E319R`, project `72W9ojzaUG20j7lu`) on every page load.
To change the roster, agents or content plan, add one row to that table, for example with the n8n MCP tool
`add_data_table_rows`. The change shows the next time a page opens. No rebuild, no redeploy, no secret needed in chat.

Rows are never edited or deleted. They are applied oldest first, so the newest row for an item wins.
A row that can't be applied is skipped and listed on the Overview under "Changes from chat" with the reason.

## Columns

| Column | What goes in it |
|---|---|
| `kind` | `role`, `department`, `gate`, `link`, `content_team`, `agent`, `post`, `video` or `plan` |
| `item_key` | Which item (see below) |
| `data` | A JSON object, as text, with only the fields that change. A new item needs its required fields. |
| `removed` | `true` to take the item off. Leave `data` empty. |
| `note` | Why, in a few words. Shows on the Overview. |
| `added_by` | Who asked for it, e.g. `Nicholas` or `Claude for Dan` |

## Kinds

| kind | item_key | data fields (required for a new item in bold) |
|---|---|---|
| `role` | role id, e.g. `sound` | **`name`**, `department`, `kind` (human, orchestrator, head, worker, reviewer), `status` (live, draft, hiring, planned, external, active), `job`, `why_it_matters`, `priority`, `outward_actions`, `n8n_agent_id`, `n8n_workflow_ids` |
| `department` | department id, e.g. `marketing` | `name`, `head`, `members` (list of role ids) |
| `gate` | gate id, e.g. `gate_post` | **`name`**, `approvers` (list of role ids), `rule` |
| `link` | `from>to>type`, e.g. `editor>poster>approval` | `label`. Types: request, delegates, reports, hands_off, revision, approval, data |
| `content_team` | `meta` | `version`, `updated`, `status`, `doc`, `schedule` (list of `{when, step}`) |
| `agent` | n8n agent id | **`name`**, `role`, `published`, `toolWorkflowIds`, `tables`, `subAgents`, `outward`, `gradient` (two colours) |
| `post` | `YYYY-MM-DD 1 pm` (date and slot as on the Content calendar) | `slot`, `platforms`, `format` (Reel, Carousel, Off), `pillar`, `project`, `hook`, `concept`, `cta`, `madeBy` |
| `video` | Google Drive file id | `title`, `project`, `note` |
| `plan` | `meta` | `title`, `account`, `period`, `written`, `status`, `docUrl` (Google Docs link only), `before` (list of `{item, owner, why}`) |

A role's `department` keeps that department's member list in step, so adding a role with `"department": "marketing"`
puts it on the Marketing chain. Removing a role also removes its links.

## Examples

Mark the Sound Designer live:

```json
{ "kind": "role", "item_key": "sound", "data": "{\"status\":\"live\"}", "note": "Published in n8n", "added_by": "Nicholas" }
```

Add Sahab's SEO agent to Websites and SEO:

```json
{ "kind": "role", "item_key": "seo_sahab", "data": "{\"name\":\"SEO Agent (Sahab)\",\"department\":\"web\",\"kind\":\"worker\",\"status\":\"external\",\"job\":\"Audits Dan's sites\"}", "note": "Migrating Sahab's agent", "added_by": "Nicholas" }
```

Change the hook on the Dec 1 post:

```json
{ "kind": "post", "item_key": "2026-12-01 1 pm", "data": "{\"hook\":\"Mornings above Brickell\"}", "note": "Dan's edit", "added_by": "Dan" }
```

Take a draft video off the Content page:

```json
{ "kind": "video", "item_key": "10uyoQOXA7IXI2PZarAWKrBMvXfP1Lurh", "removed": true, "note": "Replaced by v4", "added_by": "Nicholas" }
```

## What still changes elsewhere

- To-dos: the To-do page and the desk_todos table, already live.
- Approvals, runs, workflows and outside-agent reports: read live from n8n, already live.
- A permanent roster rewrite: edit `agent-team/structure.json`; it becomes the new baseline on the next deploy.
