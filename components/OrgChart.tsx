"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { OrgAvatar } from "./OrgAvatar";

/**
 * The whole team as one chart. Calm by default: people, Jarvis, and each department with its roles, joined
 * only by reporting lines. Select a role and its hand-offs light up across the chart, and a panel slides in
 * with what it does. "How it works" opens one level deeper.
 */

export interface ChartRole {
  id: string;
  title: string;
  name?: string;
  dept: string;
  type: string;
  status: string;
  does: string;
  reportsTo: string[];
  handsTo: string[];
  head?: boolean;
  group?: string;
  n8n?: string;
  owner?: string;
  schedule?: string;
  inputs?: string;
  approval?: string;
  more?: string;
  cap?: number;
  model?: string;
  tools?: string[];
}
export interface ChartDept { id: string; name: string; head: string | null; stage: string }

const STATUS: Record<string, [string, string]> = {
  live: ["ok", "Live"],
  draft: ["warn", "Draft"],
  planned: ["", "Planned"],
  hire: ["hire", "To hire"],
  person: ["info", "Person"],
  outside: ["info", "Outside n8n"],
  confirm: ["gold", "To confirm"],
};
const FUNNEL = ["marketing", "leaddev", "buyer", "transactions", "clientcare"];
const SUPPORT = ["ops", "people", "finance", "compliance", "partnerships"];

type Pt = { x: number; y: number; w: number; h: number };

function Tile({ r, onPick, sel, lit, big }: { r: ChartRole; onPick: (id: string) => void; sel: string | null; lit: Set<string>; big?: boolean }) {
  const [tone, label] = STATUS[r.status] ?? ["", r.status];
  const state = sel === r.id ? " sel" : sel && lit.has(r.id) ? " lit" : sel ? " dim" : "";
  return (
    <button
      type="button"
      data-node={r.id}
      className={`oc-tile${big ? " big" : ""}${state} st-${r.status}`}
      onClick={(e) => { e.stopPropagation(); onPick(r.id); }}
      aria-pressed={sel === r.id}
    >
      <OrgAvatar id={r.id} title={r.title} name={r.name} dept={r.dept} type={r.type} n8n={r.n8n} status={r.status} size={big ? 46 : 34} />
      <span className="oc-text">
        <b>{r.name ?? r.title}</b>
        <span className="oc-sub">
          <span className={`dot ${tone}`} />
          {r.name && r.type === "person" ? r.title : r.name && r.type === "agent" ? `${r.title} · ${label}` : label}
        </span>
      </span>
    </button>
  );
}

function Sheet({ r, roles, onPick, onClose }: { r: ChartRole; roles: Map<string, ChartRole>; onPick: (id: string) => void; onClose: () => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [r.id]);
  const [tone, label] = STATUS[r.status] ?? ["", r.status];
  const nameOf = (id: string) => { const x = roles.get(id); return x ? (x.name ?? x.title) : id; };
  const chips = (ids: string[]) => ids.length ? (
    <span className="oc-chips">{ids.map((id) => <button key={id} type="button" className="oc-chip" onClick={() => onPick(id)}>{nameOf(id)}</button>)}</span>
  ) : <span className="muted">None</span>;
  const deeper = [
    r.inputs && ["Works from", r.inputs],
    r.approval && ["Waits for a person", r.approval],
    r.more && ["Note", r.more],
    r.model && ["Model", r.model],
    r.tools?.length && ["Tools", r.tools.join(", ")],
    r.n8n && ["n8n agent", r.n8n],
  ].filter(Boolean) as [string, string][];
  const kind = r.type === "person" ? "Person" : r.type === "outside" ? "Outside partner" : "Agent";
  return (
    <aside className="oc-sheet glass" role="dialog" aria-label={`${r.title} details`} onClick={(e) => e.stopPropagation()}>
      <button type="button" className="oc-close" onClick={onClose} aria-label="Close">×</button>
      <div className="oc-sheet-head" key={r.id}>
        <OrgAvatar id={r.id} title={r.title} name={r.name} dept={r.dept} type={r.type} n8n={r.n8n} status={r.status} size={72} />
        <div>
          <h2>{r.name ?? r.title}</h2>
          <div className="oc-meta">
            <span>{r.name ? (r.type === "person" ? r.title : `${r.title} · ${kind}`) : kind}</span>
            <span className={`pill ${tone}`}><span className={`dot ${tone}`} />{label}</span>
          </div>
        </div>
      </div>
      <p className="oc-does" key={`d-${r.id}`}>{r.does}</p>
      <dl className="oc-facts" key={`f-${r.id}`}>
        <div><dt>Reports to</dt><dd>{chips(r.reportsTo)}</dd></div>
        <div><dt>Hands off to</dt><dd>{chips(r.handsTo)}</dd></div>
        <div><dt>Owner</dt><dd>{r.owner ?? <span className="muted">Not set</span>}</dd></div>
        <div><dt>Runs</dt><dd>{r.schedule ?? <span className="muted">When asked</span>}</dd></div>
        {r.type === "agent" && <div><dt>Monthly cap</dt><dd>{r.cap ? `$${r.cap} a month` : <span className="muted">Set when it's built</span>}</dd></div>}
      </dl>
      {deeper.length > 0 && (
        <div className={`oc-more${open ? " open" : ""}`}>
          <button type="button" className="oc-more-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><path d="M4 2.5 L7.5 6 L4 9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            How it works
          </button>
          <div className="oc-more-body"><div>
            {deeper.map(([k, v]) => <div key={k} className="oc-more-row"><span>{k}</span><span>{v}</span></div>)}
          </div></div>
        </div>
      )}
    </aside>
  );
}

export default function OrgChart({ roles, depts }: { roles: ChartRole[]; depts: ChartDept[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [pts, setPts] = useState<Record<string, Pt>>({});
  const [size, setSize] = useState({ w: 0, h: 0 });
  const byId = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);
  const dept = (id: string) => depts.find((d) => d.id === id);

  const lit = useMemo(() => {
    const s = new Set<string>();
    const r = sel ? byId.get(sel) : undefined;
    if (r) { r.handsTo.forEach((x) => s.add(x)); r.reportsTo.forEach((x) => s.add(x)); }
    for (const x of roles) if (sel && x.handsTo.includes(sel)) s.add(x.id);
    return s;
  }, [sel, byId, roles]);

  const measure = useCallback(() => {
    const w = wrap.current;
    if (!w) return;
    const base = w.getBoundingClientRect();
    const out: Record<string, Pt> = {};
    w.querySelectorAll<HTMLElement>("[data-node],[data-anchor]").forEach((el) => {
      const b = el.getBoundingClientRect();
      const key = el.dataset.node ?? el.dataset.anchor!;
      if (out[key] && el.dataset.anchor) return;
      out[key] = { x: b.left - base.left, y: b.top - base.top, w: b.width, h: b.height };
    });
    setPts(out);
    setSize({ w: w.scrollWidth, h: w.scrollHeight });
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(() => measure());
    if (wrap.current) ro.observe(wrap.current);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSel(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pick = (id: string) => setSel((cur) => (cur === id ? null : id));

  /* Reporting lines: people to Jarvis, Jarvis down a trunk to a rail over each row, a drop to each department. */
  const base: string[] = [];
  const P = (k: string) => pts[k];
  const jar = P("jarvis");
  const r = 14;
  if (jar) {
    for (const p of ["dan", "nick"]) {
      const a = P(p);
      if (a) {
        const ax = a.x + a.w / 2, ay = a.y + a.h, jx = jar.x + jar.w / 2, jy = jar.y;
        const my = (ay + jy) / 2;
        base.push(`M${ax} ${ay} C${ax} ${my} ${jx} ${my} ${jx} ${jy}`);
      }
    }
    const rows = [FUNNEL, SUPPORT].map((ids) => ids.map((id) => P(`dept-${id}`)).filter((x): x is Pt => Boolean(x)));
    const jx = jar.x + jar.w / 2;
    let prevRail: { y: number; left: number } | null = null;
    rows.forEach((row, ri) => {
      if (!row.length) return;
      const top = Math.min(...row.map((p) => p.y));
      const railY = top - 18;
      const xs = row.map((p) => p.x + p.w / 2);
      const left = Math.min(...xs), right = Math.max(...xs);
      if (ri === 0) base.push(`M${jx} ${jar.y + jar.h} V${railY}`);
      else if (prevRail) {
        const gx = Math.max(4, Math.min(...row.map((p) => p.x)) - 10);
        base.push(`M${prevRail.left} ${prevRail.y} H${gx + r} Q${gx} ${prevRail.y} ${gx} ${prevRail.y + r} V${railY - r} Q${gx} ${railY} ${gx + r} ${railY} H${left}`);
      }
      base.push(`M${left} ${railY} H${right}`);
      for (const x of xs) base.push(`M${x} ${railY} V${top}`);
      prevRail = { y: railY, left };
    });
  }

  /* Hand-offs for the selected role, drawn as arcs across the chart. */
  const links: { d: string; kind: "out" | "in" | "up" }[] = [];
  const s = sel ? byId.get(sel) : undefined;
  const arc = (from: Pt, to: Pt) => {
    const fx = from.x + from.w / 2, fy = from.y + from.h / 2, tx = to.x + to.w / 2, ty = to.y + to.h / 2;
    const dx = tx - fx, dy = ty - fy;
    const bend = Math.min(160, Math.hypot(dx, dy) * 0.35);
    const nx = -dy / (Math.hypot(dx, dy) || 1), ny = dx / (Math.hypot(dx, dy) || 1);
    const cx = (fx + tx) / 2 + nx * bend, cy = (fy + ty) / 2 + ny * bend;
    return `M${fx} ${fy} Q${cx} ${cy} ${tx} ${ty}`;
  };
  if (s && P(s.id)) {
    for (const t of s.handsTo) if (P(t) && t !== s.id) links.push({ d: arc(P(s.id), P(t)), kind: "out" });
    for (const t of s.reportsTo) if (P(t)) links.push({ d: arc(P(s.id), P(t)), kind: "up" });
    for (const x of roles) if (x.handsTo.includes(s.id) && x.id !== s.id && P(x.id) && !s.handsTo.includes(x.id)) links.push({ d: arc(P(x.id), P(s.id)), kind: "in" });
  }

  const people = ["dan", "nick"].map((id) => byId.get(id)).filter((x): x is ChartRole => Boolean(x));
  const jarvis = byId.get("jarvis");

  const column = (id: string) => {
    const d = dept(id);
    if (!d) return null;
    const members = roles.filter((x) => x.dept === id && x.id !== d.head);
    const head = d.head ? byId.get(d.head) : undefined;
    const headIsMember = head && head.dept === id;
    const groups = [...new Set(members.map((m) => m.group ?? ""))];
    return (
      <section key={id} className={`oc-dept d-${id}${groups.length > 1 ? " split" : ""}`}>
        <header data-anchor={`dept-${id}`} className="oc-dept-head">
          <span className="oc-dept-name">{d.name}</span>
          <span className="oc-dept-stage">{d.stage}</span>
        </header>
        {head && headIsMember ? (
          <Tile r={head} onPick={pick} sel={sel} lit={lit} big />
        ) : head ? (
          <button type="button" className={`oc-led${sel === head.id ? " sel" : ""}`} onClick={(e) => { e.stopPropagation(); pick(head.id); }}>
            <OrgAvatar id={head.id} title={head.title} name={head.name} dept={head.dept} type={head.type} status={head.status} size={22} />
            <span>Led by <b>{head.name ?? head.title}</b>{id === "compliance" ? ", to confirm" : ""}</span>
          </button>
        ) : null}
        <div className="oc-members">
          {groups.map((g) => (
            <div key={g || "all"} className="oc-group">
              {g && <div className="oc-group-name">{g}</div>}
              {members.filter((m) => (m.group ?? "") === g).map((m) => <Tile key={m.id} r={m} onPick={pick} sel={sel} lit={lit} />)}
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className={`oc-shell${sel ? " has-sel" : ""}`}>
      <div className="oc glass" ref={wrap} onClick={() => setSel(null)}>
        <svg className="oc-lines" width={size.w} height={size.h} aria-hidden>
          <defs>
            <marker id="oc-tip" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M1 1 L9 5 L1 9" fill="none" stroke="var(--sea-2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
          </defs>
          {base.map((d, i) => <path key={i} d={d} className="oc-base" />)}
          {links.map((l, i) => <path key={`${sel}-${i}`} d={l.d} className={`oc-link ${l.kind}`} markerEnd={l.kind === "up" ? undefined : "url(#oc-tip)"} pathLength={1} />)}
        </svg>
        <div className="oc-top">
          {people.map((p) => <Tile key={p.id} r={p} onPick={pick} sel={sel} lit={lit} big />)}
        </div>
        {jarvis && <div className="oc-jarvis"><Tile r={jarvis} onPick={pick} sel={sel} lit={lit} big /></div>}
        <div className="oc-row funnel">{FUNNEL.map(column)}</div>
        <div className="oc-row support">{SUPPORT.map(column)}</div>
      </div>
      {s && <Sheet r={s} roles={byId} onPick={pick} onClose={() => setSel(null)} />}
    </div>
  );
}
