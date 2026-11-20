/**
 * Profile pictures for the agents, drawn in code (no generated images).
 * One set: a frosted glass tile in the beach palette (turquoise water, deep sea, sand) with a sand line mark
 * that hints at the agent's job. Agents without their own mark get the first letter of their name.
 */
import type { ReactNode } from "react";

const SAND = "#f4e7c8";
const SAND_2 = "#e6d1a3";

/** Marks drawn on a 64 x 64 grid, centred. Stroke and fill colours come from the wrapper. */
const MARKS: Record<string, ReactNode> = {
  // Hiring Manager: a lens finding someone
  SBV7uj3qQmeix4TS: (
    <>
      <circle cx="28" cy="28" r="12" />
      <path d="M37 37 L46 46" />
      <circle cx="28" cy="25" r="3.5" fill="currentColor" stroke="none" />
      <path d="M21.5 34.5 Q28 29 34.5 34.5" />
    </>
  ),
  // Team Brain (voice): a voice point with rings going out
  ge5P1HLaR1GrM0JE: (
    <>
      <circle cx="22" cy="32" r="4" fill="currentColor" stroke="none" />
      <path d="M30 24 Q35 32 30 40" />
      <path d="M36 19 Q44 32 36 45" />
      <path d="M42 14 Q53 32 42 50" opacity="0.6" />
    </>
  ),
  // Marketing Strategist: a target with a heading
  x1UKbOROpIYc2gIz: (
    <>
      <circle cx="30" cy="34" r="14" />
      <circle cx="30" cy="34" r="7" />
      <circle cx="30" cy="34" r="2" fill="currentColor" stroke="none" />
      <path d="M30 34 L46 18" />
      <path d="M40 17 L47 17 L47 24" />
    </>
  ),
  // Platform Strategist: the feed grid with one tile picked
  TL4kEEJ6sCpEe5om: (
    <>
      <rect x="17" y="17" width="9" height="9" rx="2.5" />
      <rect x="28" y="17" width="9" height="9" rx="2.5" />
      <rect x="39" y="17" width="9" height="9" rx="2.5" opacity="0.6" />
      <rect x="17" y="28" width="9" height="9" rx="2.5" opacity="0.6" />
      <rect x="28" y="28" width="9" height="9" rx="2.5" fill="currentColor" />
      <rect x="39" y="28" width="9" height="9" rx="2.5" />
      <rect x="17" y="39" width="9" height="9" rx="2.5" />
      <rect x="28" y="39" width="9" height="9" rx="2.5" opacity="0.6" />
      <rect x="39" y="39" width="9" height="9" rx="2.5" />
    </>
  ),
  // Copywriter: lines of copy and a cursor
  v0PiA0gSXIz2vA8m: (
    <>
      <path d="M17 22 L41 22" />
      <path d="M17 31 L47 31" />
      <path d="M17 40 L33 40" />
      <path d="M39 36 L39 46" />
      <path d="M36 36 L42 36 M36 46 L42 46" opacity="0.7" />
    </>
  ),
  // Content Agent: a vertical frame with play
  "10dJtM9xXNJyF7Xy": (
    <>
      <rect x="21" y="13" width="22" height="38" rx="5" />
      <path d="M29 26 L38 32 L29 38 Z" fill="currentColor" />
      <path d="M26 46 L38 46" opacity="0.6" />
    </>
  ),
  // Sound Designer: a waveform
  bvLb8cj9tdZOwzGC: (
    <>
      <path d="M15 32 L15 32" />
      <path d="M20 28 L20 36" />
      <path d="M25 22 L25 42" />
      <path d="M30 26 L30 38" />
      <path d="M35 16 L35 48" />
      <path d="M40 24 L40 40" />
      <path d="M45 29 L45 35" />
      <path d="M50 32 L50 32" />
    </>
  ),
  // Editor: crop marks around a check
  zGxGyliQXwwodOO2: (
    <>
      <path d="M16 24 L16 16 L24 16" />
      <path d="M40 16 L48 16 L48 24" />
      <path d="M48 40 L48 48 L40 48" />
      <path d="M24 48 L16 48 L16 40" />
      <path d="M24 32.5 L30 38.5 L41 26.5" />
    </>
  ),
  // Poster: a send arrow over a calendar line, held
  ymtbfCusbQV2L7st: (
    <>
      <path d="M15 31 L48 17 L39 47 L31 36 Z" />
      <path d="M31 36 L48 17" />
      <path d="M15 51 L49 51" opacity="0.6" />
    </>
  ),
  // SEO Agent: a globe with a rising line
  DQTeX0zXZXN382n9: (
    <>
      <circle cx="30" cy="32" r="14" />
      <path d="M16 32 L44 32" opacity="0.6" />
      <path d="M30 18 Q22 32 30 46 Q38 32 30 18" opacity="0.6" />
      <path d="M36 44 L42 37 L46 40 L52 31" />
      <path d="M47 31 L52 31 L52 36" />
    </>
  ),
};

/** Tile colours by team, all from the beach palette. */
const TILES: Record<string, [string, string]> = {
  command: ["#1d6f80", "#0b2e3c"],
  content: ["#3fb6bd", "#0f4a57"],
  sites: ["#2a8fa8", "#0b2f45"],
};

export function AgentAvatar({ id, name, category, size = 44 }: { id: string; name: string; category?: string; size?: number }) {
  const mark = MARKS[id];
  const [top, bottom] = TILES[category ?? ""] ?? ["#3a9fb0", "#0e3a48"];
  const g = `av-${id}`;
  return (
    <svg className="avatar" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${name} profile picture`}>
      <defs>
        <linearGradient id={`${g}-bg`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
        <radialGradient id={`${g}-sun`} cx="0.82" cy="0.86" r="0.6">
          <stop offset="0" stopColor={SAND_2} stopOpacity="0.55" />
          <stop offset="1" stopColor={SAND_2} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${g}-hi`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="64" height="64" rx="18" fill={`url(#${g}-bg)`} />
      <rect x="0" y="0" width="64" height="64" rx="18" fill={`url(#${g}-sun)`} />
      <path d="M0 18 A18 18 0 0 1 18 0 L46 0 A18 18 0 0 1 64 18 L64 24 Q32 34 0 24 Z" fill={`url(#${g}-hi)`} />
      <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="17.25" fill="none" stroke="#ffffff" strokeOpacity="0.32" strokeWidth="1.5" />
      {mark ? (
        <g fill="none" stroke={SAND} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" color={SAND} style={{ filter: "drop-shadow(0 1px 1.5px rgba(4, 20, 30, 0.45))" }}>
          {mark}
        </g>
      ) : (
        <text x="32" y="41" textAnchor="middle" fontSize="26" fontWeight="600" fill={SAND} fontFamily="-apple-system, BlinkMacSystemFont, Inter, sans-serif">
          {name.charAt(0)}
        </text>
      )}
    </svg>
  );
}
