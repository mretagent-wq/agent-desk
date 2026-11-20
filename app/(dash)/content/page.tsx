import Link from "next/link";
import { IconShield } from "@/components/Icons";
import { when } from "@/lib/format";
import type { Row } from "@/lib/n8n";
import { drivePreview, type PlannedPost } from "@/lib/content-plan";
import { getPlan, getTeam } from "@/lib/live";
import { deptColor, type RoleStatus } from "@/lib/structure";
import { content, snapshot } from "@/lib/view";

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

const ROLE_STATUS: Record<RoleStatus, [string, string]> = {
  live: ["ok", "Live"],
  draft: ["warn", "Draft"],
  hiring: ["gold", "Hiring"],
  planned: ["", "Planned"],
  external: ["info", "Outside n8n"],
  active: ["info", "Person"],
};

const QUEUE_STATUS: Record<string, [string, string]> = {
  awaiting_render: ["warn", "Waiting for render"],
  awaiting_approval: ["warn", "Waiting for your yes"],
  ready_for_review: ["warn", "Ready for review"],
  pending_approval: ["warn", "Waiting for your yes"],
  approved: ["ok", "Approved"],
  changes_requested: ["bad", "Changes asked"],
  scheduled: ["info", "Scheduled"],
  posted: ["ok", "Posted"],
};
const queueStatus = (s: string): [string, string] => QUEUE_STATUS[s] ?? ["", s ? s.replace(/_/g, " ") : "No status"];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** A brief's date: its week (a Monday) plus the day named in its slot. */
function briefDate(b: Row): string | null {
  const week = str(b.week_of);
  const day = DAYS.indexOf(str(b.post_slot).slice(0, 3));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || day < 0) return null;
  const d = new Date(`${week}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + day);
  return d.toISOString().slice(0, 10);
}

function dayLabel(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function weeks(posts: PlannedPost[]) {
  const out: { start: string; posts: PlannedPost[] }[] = [];
  for (const p of posts) {
    const d = new Date(`${p.date}T12:00:00Z`);
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    const w = out.find((x) => x.start === key) ?? (out.push({ start: key, posts: [] }), out[out.length - 1]);
    w.posts.push(p);
  }
  return out;
}

function Video({ src, title }: { src: string; title: string }) {
  return (
    <div className="vframe">
      <iframe src={src} title={title} allow="autoplay; fullscreen" loading="lazy" referrerPolicy="no-referrer" />
    </div>
  );
}

export default async function Content() {
  const [c, s, t, { plan: PLAN, meta: PLAN_META, videos }] = await Promise.all([content(), snapshot(), getTeam(), getPlan()]);
  const { contentPipeline, gate, label, role } = t;
  const pipeline = contentPipeline();
  const DRIVE_VIDEOS = videos.filter((v) => drivePreview(v.fileId));

  const weekOf = c.briefs.map((b) => str(b.week_of)).filter(Boolean).sort().pop() ?? "";
  const briefs = c.briefs
    .filter((b) => str(b.week_of) === weekOf)
    .sort((a, b) => (briefDate(a) ?? "").localeCompare(briefDate(b) ?? "") || a.id - b.id);
  const otherWeeks = new Set(c.briefs.map((b) => str(b.week_of)).filter((w) => w && w !== weekOf)).size;
  const queue = [...c.queue].sort((a, b) => b.id - a.id);
  const waiting = s.approvals.filter((a) => a.sourceId === "content_queue").length;
  const posted = queue.filter((q) => str(q.status) === "posted").length;

  const byDate = new Map<string, Row[]>();
  for (const b of c.briefs) {
    const d = briefDate(b);
    if (d) byDate.set(d, [...(byDate.get(d) ?? []), b]);
  }
  const planStatus = (p: PlannedPost) => {
    const first = p.project.split(/[\s-]/)[0].toLowerCase();
    return (byDate.get(p.date) ?? []).find((b) => str(b.project).toLowerCase().includes(first));
  };

  const feed = PLAN.filter((p) => p.format !== "Off");
  const pillars = Object.entries(feed.reduce<Record<string, number>>((m, p) => ((m[p.pillar] = (m[p.pillar] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
  const reels = feed.filter((p) => p.format === "Reel").length;

  return (
    <>
      <header className="top">
        <div>
          <div className="eyebrow">{PLAN_META.account}</div>
          <h1>Content</h1>
          <p>What&apos;s planned, why each post exists, what&apos;s being made, and what waits for your yes. Nothing posts on its own.</p>
        </div>
      </header>

      {c.errors.length > 0 && (
        <div className="banner glass"><b>Some content data didn&apos;t load.</b> {c.errors[0]}</div>
      )}

      <section className="grid kpis">
        <div className="glass card kpi"><div className="k">Planned for December</div><div className="v">{feed.length}</div><div className="muted small">{reels} Reels, {feed.length - reels} carousels</div></div>
        <div className="glass card kpi"><div className="k">Briefs this week</div><div className="v">{briefs.length}</div><div className="muted small">{weekOf ? `Week of ${dayLabel(weekOf)}` : "None yet"}</div></div>
        <div className="glass card kpi"><div className="k">In production</div><div className="v">{queue.length - posted}</div><div className="muted small">From the content queue</div></div>
        <div className="glass card kpi"><div className="k">Waiting for you</div><div className="v" style={{ color: waiting ? "var(--warn)" : undefined }}>{waiting}</div><div className="muted small"><Link className="link" href="/approvals">Open Approvals</Link></div></div>
        <div className="glass card kpi"><div className="k">Posted</div><div className="v">{posted}</div><div className="muted small">No posting agent connected yet</div></div>
      </section>

      <section className="glass card">
        <div className="card-head">
          <h2>Who does what</h2>
          <span className="muted small">From the team roster, including changes made from chat.</span>
        </div>
        <ol className="pipeline" style={{ ["--n" as string]: pipeline.length }}>
          {pipeline.map((st) => {
            const r = role(st.id);
            const g = gate(st.id);
            const [tone, text] = r ? ROLE_STATUS[r.status] : g ? ["gold", "Your yes"] : ["", "Not on the roster"];
            return (
              <li key={st.id} className={g ? "gate" : r?.status ?? "missing"} style={{ ["--accent" as string]: deptColor(r?.department ?? "marketing") }}>
                <div className="pipe-stage">{st.stage}</div>
                <b>{g ? <><IconShield /> {g.approvers.map(label).join(" and ")}</> : r?.name ?? st.id}</b>
                <span className={`pill ${tone}`}>{text}</span>
                <div className="pipe-job">{g ? g.rule : r?.job ?? ""}</div>
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <div className="sect-head">
          <h2>This week&apos;s briefs</h2>
          <span className="muted small">
            {weekOf ? `Week of ${dayLabel(weekOf)}, from the Strategist` : "The Strategist hasn't written any yet"}
            {otherWeeks ? ` · ${otherWeeks} other week${otherWeeks === 1 ? "" : "s"} saved` : ""}
          </span>
        </div>
        {briefs.length === 0 ? (
          <div className="glass card muted">No briefs yet. They appear here when the Marketing Strategist saves them.</div>
        ) : (
          <div className="briefs">
            {briefs.map((b) => {
              const d = briefDate(b);
              const pending = /BROKERAGE LINE PENDING/i.test(str(b.notes));
              return (
                <article key={b.id} className="glass card brief">
                  <div className="brief-top">
                    <span className="when">{d ? dayLabel(d) : str(b.post_slot)} · {str(b.post_slot).replace(/^\w{3}\s*/, "")}</span>
                    <span className="pill">{str(b.format)}</span>
                  </div>
                  <h3>{str(b.project)}</h3>
                  <div className="tags">
                    <span>{str(b.pillar)}</span>
                    <span>{str(b.funnel_stage)}</span>
                    <span>{str(b.segment)}</span>
                    <span>{str(b.hook_type)} hook</span>
                  </div>
                  <dl>
                    <dt>Intent</dt><dd>{str(b.objective)}</dd>
                    <dt>Angle</dt><dd>{str(b.angle)}</dd>
                    <dt>Ask</dt><dd>{str(b.cta)}</dd>
                    <dt>Where</dt><dd>{str(b.channel)}</dd>
                  </dl>
                  <details>
                    <summary>The test and when to drop it</summary>
                    <p>{str(b.hypothesis)}</p>
                  </details>
                  <details>
                    <summary>Check before posting</summary>
                    <p className="pre">{str(b.verify_before_posting)}</p>
                  </details>
                  <div className="brief-foot">
                    <span className={`pill ${str(b.status) === "planned" ? "" : "info"}`}>{str(b.status) || "planned"}</span>
                    {pending && <span className="pill warn">Brokerage line pending</span>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="sect-head">
          <h2>In production</h2>
          <span className="muted small">What the Content Agent has made. Approve or send back in Approvals.</span>
        </div>
        {queue.length === 0 ? (
          <div className="glass card muted">Nothing in the content queue yet.</div>
        ) : (
          <div className="queue">
            {queue.map((q) => {
              const [tone, text] = queueStatus(str(q.status));
              const preview = drivePreview(str(q.drive_link));
              return (
                <article key={q.id} className="glass card qitem">
                  {preview ? <Video src={preview} title={str(q.title)} /> : (
                    <div className="vframe empty"><span>No video yet</span><span className="muted small">{text}</span></div>
                  )}
                  <div className="qbody">
                    <div className="brief-top">
                      <span className="muted small">{str(q.project)}</span>
                      <span className={`pill ${tone}`}>{text}</span>
                    </div>
                    <h3>{str(q.title)}</h3>
                    <div className="muted small">{str(q.format)}</div>
                    <dl>
                      <dt>Hook</dt><dd>{str(q.hook)}</dd>
                      <dt>Why it works</dt><dd>{str(q.usp)}</dd>
                    </dl>
                    <details>
                      <summary>Caption and hashtags</summary>
                      <p className="pre">{str(q.caption)}</p>
                      <p className="muted">{str(q.hashtags)}</p>
                    </details>
                    <div className="row-actions">
                      {preview && <a className="btn sm" href={str(q.drive_link)} target="_blank" rel="noreferrer">Open in Drive</a>}
                      <Link className="btn sm ghost" href="/approvals">Review in Approvals</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {DRIVE_VIDEOS.length > 0 && (
        <section>
          <div className="sect-head">
            <h2>Draft cuts in Drive</h2>
            <span className="muted small">Plays only for people with access to the file.</span>
          </div>
          <div className="drafts">
            {DRIVE_VIDEOS.map((v) => {
              const src = drivePreview(v.fileId)!;
              return (
                <article key={v.fileId} className="glass card draft">
                  <Video src={src} title={v.title} />
                  <h3>{v.title}</h3>
                  <div className="muted small">{v.project} · {v.note}</div>
                  <a className="link" href={`https://drive.google.com/file/d/${v.fileId}/view`} target="_blank" rel="noreferrer">Open in Drive</a>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <div className="sect-head">
          <h2>December calendar</h2>
          <span className="muted small">
            {PLAN_META.status} <a className="link" href={PLAN_META.docUrl} target="_blank" rel="noreferrer">Open the plan</a>
          </span>
        </div>
        <div className="glass card mix">
          {pillars.map(([p, n]) => (
            <span key={p} className="mix-item"><b>{n}</b> {p}</span>
          ))}
        </div>
        <details className="glass card before">
          <summary>{PLAN_META.before.length} things must be ready before Dec 1</summary>
          <ul>
            {PLAN_META.before.map((b) => (
              <li key={b.item}><b>{b.item}</b> <span className="muted">({b.owner})</span> {b.why}</li>
            ))}
          </ul>
        </details>
        <div className="cal">
          {weeks(PLAN).map((w) => (
            <div key={w.start} className="glass card week">
              <div className="week-head">Week of {dayLabel(w.start)} <span className="muted small">{w.posts.filter((p) => p.format !== "Off").length} posts</span></div>
              {w.posts.map((p, i) => {
                const b = planStatus(p);
                return (
                  <div key={`${p.date}-${i}`} className={`cal-row ${p.format === "Off" ? "off" : ""}`}>
                    <div className="cal-when"><b>{dayLabel(p.date)}</b><span>{p.slot}</span></div>
                    <div className="cal-what">
                      <div className="cal-title">
                        <span className={`fmt ${p.format.toLowerCase()}`}>{p.format}</span>
                        <b>{p.project}</b>
                      </div>
                      {p.hook && <div className="cal-hook">&ldquo;{p.hook}&rdquo;</div>}
                      <div className="cal-concept">{p.concept}</div>
                    </div>
                    <div className="cal-meta">
                      {p.pillar && <span className="tag">{p.pillar}</span>}
                      {p.cta && <span className="muted small">{p.cta}</span>}
                      {p.platforms && <span className="muted small">{p.platforms}</span>}
                    </div>
                    <div className="cal-status">
                      {p.format === "Off" ? null : b ? <span className="pill info">Brief {str(b.status)}</span> : <span className="pill">Planned</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <p className="muted small" style={{ padding: "12px 4px 0" }}>
          Calendar from {PLAN_META.title}, written {when(`${PLAN_META.written}T12:00:00Z`)}, plus any changes made from chat. A change shows the next time this page opens; no redeploy.
        </p>
      </section>
    </>
  );
}
