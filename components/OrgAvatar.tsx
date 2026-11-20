/**
 * Profile pictures for every role on the org chart, drawn in code (no generated images).
 * Agents with their own mark use it. Other agents get their department's mark on the department's tile.
 * People get a sand tile with their initial. Roles not built yet are drawn lighter with a dashed ring.
 */
import type { ReactNode } from "react";
import { AgentAvatar, hasMark } from "./AgentAvatar";

const SAND = "#f4e7c8";

const DEPT_TILE: Record<string, [string, string]> = {
  leadership: ["#2b8ea0", "#0a2a38"],
  marketing: ["#3fb6bd", "#0f4a57"],
  leaddev: ["#4aa3c8", "#0c3550"],
  buyer: ["#2f9c8f", "#0a3a36"],
  transactions: ["#5a8fc0", "#13304f"],
  clientcare: ["#53b59c", "#0e3d3a"],
  ops: ["#6f98b0", "#16313f"],
  people: ["#45a0b8", "#0e3442"],
  finance: ["#7aa6a0", "#173a3a"],
  compliance: ["#8394b8", "#1a2a45"],
  partnerships: ["#5fb0a8", "#123e44"],
};

const DEPT_MARK: Record<string, ReactNode> = {
  leadership: (<><path d="M32 14 L36 28 L50 32 L36 36 L32 50 L28 36 L14 32 L28 28 Z" /><circle cx="32" cy="32" r="3" fill="currentColor" stroke="none" /></>),
  marketing: (<><path d="M17 36 L17 28 L36 20 L36 44 Z" /><path d="M36 26 Q46 32 36 38" opacity="0.6" /><path d="M22 37 L25 47 L30 47 L28 39" /><path d="M44 20 L48 16" /><path d="M46 32 L52 32" /><path d="M44 44 L48 48" /></>),
  leaddev: (<><path d="M15 18 L49 18 L36 33 L36 46 L28 50 L28 33 Z" /><path d="M21 24 L43 24" opacity="0.6" /></>),
  buyer: (<><circle cx="24" cy="32" r="9" /><circle cx="24" cy="32" r="2.5" fill="currentColor" stroke="none" /><path d="M33 32 L50 32 L50 38" /><path d="M43 32 L43 37" /></>),
  transactions: (<><path d="M20 14 L38 14 L46 22 L46 50 L20 50 Z" /><path d="M38 14 L38 22 L46 22" opacity="0.6" /><path d="M26 35 L31 40 L40 29" /></>),
  clientcare: (<><path d="M15 31 L32 17 L49 31" /><path d="M20 28 L20 48 L44 48 L44 28" /><path d="M32 43 C24 37 25 31 29 31 C31 31 32 33 32 33 C32 33 33 31 35 31 C39 31 40 37 32 43 Z" fill="currentColor" stroke="none" /></>),
  ops: (<><circle cx="32" cy="32" r="8" /><path d="M32 14 L32 20 M32 44 L32 50 M14 32 L20 32 M44 32 L50 32 M19 19 L23.5 23.5 M40.5 40.5 L45 45 M19 45 L23.5 40.5 M40.5 23.5 L45 19" /></>),
  people: (<><circle cx="25" cy="25" r="6" /><path d="M14 46 Q14 35 25 35 Q36 35 36 46" /><circle cx="41" cy="27" r="5" opacity="0.6" /><path d="M39 36 Q50 36 50 46" opacity="0.6" /></>),
  finance: (<><path d="M16 48 L48 48" opacity="0.6" /><path d="M21 48 L21 36" /><path d="M30 48 L30 28" /><path d="M39 48 L39 32" /><path d="M48 48 L48 20" /><path d="M18 26 L28 20 L36 24 L46 15" opacity="0.6" /></>),
  compliance: (<><path d="M32 13 L48 19 L48 32 Q48 44 32 51 Q16 44 16 32 L16 19 Z" /><path d="M25 32 L30 37 L39 27" /></>),
  partnerships: (<><rect x="12" y="25" width="22" height="14" rx="7" /><rect x="30" y="25" width="22" height="14" rx="7" /></>),
};

export function OrgAvatar({ id, title, name, dept, type, n8n, status, photo, size = 40 }: { id: string; title: string; name?: string; dept: string; type: string; n8n?: string; status: string; photo?: string; size?: number }) {
  if (photo) {
    // A real photo, round like a Mac profile picture.
    // eslint-disable-next-line @next/next/no-img-element
    return <span className="oav photo" style={{ width: size, height: size }}><img className="avatar" src={photo} alt={`${name ?? title} profile picture`} width={size} height={size} /></span>;
  }
  const pending = status === "planned" || status === "hire" || status === "confirm";
  const cls = `oav${pending ? " pending" : ""}${type === "person" ? " person" : ""}`;
  if (n8n && hasMark(n8n)) {
    return <span className={cls} style={{ width: size, height: size }}><AgentAvatar id={n8n} name={title} category={dept === "marketing" ? "content" : "command"} size={size} /></span>;
  }
  const g = `oav-${id}`;
  const person = type === "person" || type === "outside";
  const [top, bottom] = person ? (["#f6ead0", "#d9bf8c"] as [string, string]) : DEPT_TILE[dept] ?? ["#3a9fb0", "#0e3a48"];
  const ink = person ? "#0b2e3c" : SAND;
  const letter = (name ?? title).replace(/^(The|Dan's)\s+/, "").charAt(0).toUpperCase();
  return (
    <span className={cls} style={{ width: size, height: size }}>
      <svg className="avatar" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${name ?? title} profile picture`}>
        <defs>
          <linearGradient id={`${g}-bg`} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor={top} />
            <stop offset="1" stopColor={bottom} />
          </linearGradient>
          <linearGradient id={`${g}-hi`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="64" height="64" rx="18" fill={`url(#${g}-bg)`} />
        <path d="M0 18 A18 18 0 0 1 18 0 L46 0 A18 18 0 0 1 64 18 L64 24 Q32 34 0 24 Z" fill={`url(#${g}-hi)`} />
        <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="17.25" fill="none" stroke="#ffffff" strokeOpacity="0.32" strokeWidth="1.5" />
        {person ? (
          <text x="32" y="42" textAnchor="middle" fontSize="27" fontWeight="600" fill={ink} fontFamily="-apple-system, BlinkMacSystemFont, Inter, sans-serif">{type === "outside" ? "§" : letter}</text>
        ) : (
          <g fill="none" stroke={ink} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" color={ink} style={{ filter: "drop-shadow(0 1px 1.5px rgba(4, 20, 30, 0.45))" }}>
            {DEPT_MARK[id === "jarvis" ? "leadership" : dept] ?? <circle cx="32" cy="32" r="10" />}
          </g>
        )}
      </svg>
    </span>
  );
}
