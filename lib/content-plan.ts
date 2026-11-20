/**
 * The month's posting calendar, copied from the plan doc "Dan Maza PA - December 2026 Content Plan v1"
 * (07 Social & Video). The Marketing Strategist writes a new plan a month ahead; when it does, replace PLAN below
 * (or point the Content page at a data table once the Strategist saves its calendar there).
 *
 * Status is not stored here: the Content page shows each post's live state from the briefs and the content queue
 * in n8n when it finds a match by date and project.
 */

export interface PlannedPost {
  date: string; // YYYY-MM-DD, Eastern time
  slot: string; // "1 pm"
  platforms: string;
  format: string;
  pillar: string;
  project: string;
  hook: string;
  concept: string;
  cta: string;
  madeBy: string;
}

export const PLAN_META = {
  title: "December 2026 content plan v1",
  account: "Miami Real Estate Trends",
  period: "Dec 1 to 31, 2026",
  written: "2026-11-19",
  status: "Draft for Nicholas and Dan. Nothing posts until both approve each post.",
  docUrl: "https://docs.google.com/document/d/1wQjpvlquPbSL3WMDnhQ7qy6YnFI8m6rz0wJe-gjQqTU/edit",
  before: [
    { item: "Fortune's approved brokerage line", owner: "Dan with Fortune", why: "Required in every caption and end card. The plan starts the day after it's approved." },
    { item: "Admin access to Instagram and Facebook", owner: "Dan, Nicholas", why: "The Posting Agent can only publish to an account it's connected to." },
    { item: "Comment-to-DM tool and price sheet PDFs", owner: "Nicholas to approve", why: "Until then, CTAs read \"DM us for the price sheet\"." },
    { item: "Footage check per project folder", owner: "Content Agent", why: "A Reel with no usable footage becomes a carousel." },
    { item: "Open facts: Cipriani floors and completion, Faena count and year, ORA price", owner: "Strategist, Dan", why: "No figure goes out until checked within 7 days of posting." },
  ],
};

const DROPBOX = "Content Agent, Dropbox footage";
const CARDS = "Content Agent, site card layout";
const FIGURE = "Content Agent; Strategist rechecks the figure";
const DAN = "Dan on camera if he agrees, else Content Agent";
const ALL = "IG, FB, TikTok, Shorts";
const META = "IG, FB";
const RECAP = "One slide per project shown this week, cover style, last slide CTA.";

export const PLAN: PlannedPost[] = [
  { date: "2026-12-01", slot: "1 pm", platforms: ALL, format: "Reel", pillar: "Spotlight", project: "Cipriani Residences Miami", hook: "Picture your mornings up here", concept: "Golden-hour aerial pull-back, 5 to 6 shots, location and completion cards.", cta: "Comment CIPRIANI for the price sheet", madeBy: DROPBOX },
  { date: "2026-12-02", slot: "1 pm", platforms: META, format: "Carousel", pillar: "Market proof", project: "$2M to $5M condo sales up 18.3% YoY, Q3 2026", hook: "Up 18.3% in a year", concept: "The stat, what it means for buyers in that band, three projects in the band.", cta: "Comment CIPRIANI for the price sheet", madeBy: FIGURE },
  { date: "2026-12-03", slot: "1 pm", platforms: ALL, format: "Reel", pillar: "Spotlight", project: "Faena Residences Miami", hook: "Art Basel week, Miami Beach", concept: "Open on the beachfront, not the fair. Count and completion stay off until verified.", cta: "Comment FAENA for the price sheet", madeBy: DROPBOX },
  { date: "2026-12-04", slot: "1 pm", platforms: META, format: "Carousel", pillar: "Unit deconstruct", project: "Delano Residences & Hotel Miami", hook: "One residence, room by room", concept: "One residence line: size, bedrooms, exposure, floor plan, finishes, price-from.", cta: "DM us for the floor plans", madeBy: CARDS },
  { date: "2026-12-05", slot: "10 am", platforms: ALL, format: "Reel", pillar: "Spotlight", project: "Casa Cipriani Miami Beach", hook: "On the water, Miami Beach", concept: "Bay or ocean opener, interiors, view.", cta: "Comment CIPRIANI for the price sheet", madeBy: DROPBOX },
  { date: "2026-12-06", slot: "10 am", platforms: META, format: "Carousel", pillar: "Spotlight recap", project: "Week in 5", hook: "This week's 5 projects", concept: RECAP, cta: "Comment the project name for its price sheet", madeBy: CARDS },
  { date: "2026-12-07", slot: "1 pm", platforms: ALL, format: "Reel", pillar: "Progress vs rendering", project: "Continuum 12000 - Miami", hook: "Rendered then. Rising now.", concept: "Rendering hard-cut to the newest drone shot.", cta: "DM us for the price sheet", madeBy: DROPBOX },
  { date: "2026-12-08", slot: "1 pm", platforms: ALL, format: "Reel", pillar: "Spotlight", project: "Ora by Casa Tua", hook: "Picture your evenings here", concept: "Casa Tua hospitality as the proposition, view and amenity shots. Pricing on request.", cta: "Comment ORA for the floor plans", madeBy: DROPBOX },
  { date: "2026-12-09", slot: "1 pm", platforms: ALL, format: "Reel", pillar: "Advisor answer", project: "How pre-construction deposits are usually staged", hook: "How do deposits really work?", concept: "20 to 45 s, three beats: schedule, where funds are held, what to read. Not legal advice.", cta: "DM us your questions", madeBy: DAN },
  { date: "2026-12-10", slot: "1 pm", platforms: META, format: "Carousel", pillar: "Floor plan", project: "619 Brickell", hook: "What 1,000 sq ft looks like", concept: "Floor plan first, then rooms and finishes. Size in hook only if verified.", cta: "DM us for the floor plans", madeBy: CARDS },
  { date: "2026-12-11", slot: "1 pm", platforms: ALL, format: "Reel", pillar: "Progress vs rendering", project: "St Regis - Sunny Isles", hook: "Rendered then. Rising now.", concept: "Rendering vs current drone.", cta: "Comment STREGIS for the price sheet", madeBy: DROPBOX },
  { date: "2026-12-12", slot: "10 am", platforms: ALL, format: "Reel", pillar: "Spotlight", project: "Waldorf Astoria Miami", hook: "Above Biscayne Bay", concept: "Height and skyline as the proposition.", cta: "DM us for the price sheet", madeBy: DROPBOX },
  { date: "2026-12-13", slot: "10 am", platforms: META, format: "Carousel", pillar: "Spotlight recap", project: "Week in 5", hook: "This week's 5 projects", concept: RECAP, cta: "Comment the project name for its price sheet", madeBy: CARDS },
  { date: "2026-12-14", slot: "1 pm", platforms: ALL, format: "Reel", pillar: "Market proof", project: "61% of $1M+ South Florida sales paid in cash, H1 2026", hook: "61% paid in cash", concept: "Number on the hero shot, then who is buying pre-construction.", cta: "Comment CIPRIANI for the price sheet", madeBy: FIGURE },
  { date: "2026-12-15", slot: "1 pm", platforms: ALL, format: "Reel", pillar: "Spotlight", project: "The Residences at Mandarin Oriental, Miami", hook: "Brickell Key, on the water", concept: "Island setting and service.", cta: "DM us for the price sheet", madeBy: DROPBOX },
  { date: "2026-12-15", slot: "6 pm", platforms: META, format: "Carousel", pillar: "Unit deconstruct", project: "Cipriani Residences Miami", hook: "One residence, room by room", concept: "One residence line from the price sheet.", cta: "Comment CIPRIANI for the price sheet", madeBy: CARDS },
  { date: "2026-12-16", slot: "1 pm", platforms: ALL, format: "Reel", pillar: "Spotlight", project: "Viceroy Miami", hook: "Picture your mornings here", concept: "View and amenity deck.", cta: "DM us for the price sheet", madeBy: DROPBOX },
  { date: "2026-12-16", slot: "6 pm", platforms: ALL, format: "Reel", pillar: "Advisor answer", project: "Short-term rental rules in branded residences", hook: "Can you rent it out?", concept: "What to ask: minimum stay, rental programme, fees.", cta: "DM us your questions", madeBy: DAN },
  { date: "2026-12-17", slot: "1 pm", platforms: ALL, format: "Reel", pillar: "Spotlight", project: "CasaBella - Miami", hook: "Pure living, Miami", concept: "Interiors and design detail as the proposition.", cta: "DM us for the price sheet", madeBy: DROPBOX },
  { date: "2026-12-17", slot: "6 pm", platforms: META, format: "Carousel", pillar: "Floor plan", project: "Icon Beach - Hollywood", hook: "Steps from the sand", concept: "Floor plan first, then terrace and view.", cta: "DM us for the floor plans", madeBy: CARDS },
  { date: "2026-12-18", slot: "1 pm", platforms: ALL, format: "Reel", pillar: "Progress vs rendering", project: "NOMAD", hook: "Rendered then. Rising now.", concept: "Rendering vs current footage.", cta: "DM us for the price sheet", madeBy: DROPBOX },
  { date: "2026-12-18", slot: "6 pm", platforms: META, format: "Carousel", pillar: "Market proof", project: "Miami-Dade top-5% condo threshold now $3.4M", hook: "Top 5% starts at $3.4M", concept: "Stat, then three projects at or above it.", cta: "Comment FAENA for the price sheet", madeBy: FIGURE },
  { date: "2026-12-19", slot: "10 am", platforms: ALL, format: "Reel", pillar: "Spotlight", project: "St Regis - Bahia Mar - Fort Lauderdale", hook: "Fort Lauderdale, on the marina", concept: "Marina and water opener.", cta: "DM us for the price sheet", madeBy: DROPBOX },
  { date: "2026-12-20", slot: "10 am", platforms: META, format: "Carousel", pillar: "Spotlight recap", project: "Week in 5", hook: "This week's 5 projects", concept: RECAP, cta: "Comment the project name for its price sheet", madeBy: CARDS },
  { date: "2026-12-21", slot: "1 pm", platforms: ALL, format: "Reel", pillar: "Spotlight", project: "301 Ocean Dr - Key Biscayne", hook: "Key Biscayne, oceanfront", concept: "Island calm as the proposition.", cta: "DM us for the price sheet", madeBy: DROPBOX },
  { date: "2026-12-21", slot: "6 pm", platforms: META, format: "Carousel", pillar: "Market proof", project: "Mexico buyer volume roughly doubled to $981M", hook: "Mexico buyers doubled", concept: "Stat, then two projects popular with Latin American buyers. First Spanish caption.", cta: "Comment ORA for the floor plans", madeBy: FIGURE },
  { date: "2026-12-22", slot: "1 pm", platforms: ALL, format: "Reel", pillar: "Progress vs rendering", project: "Faena Residences Miami", hook: "Rendered then. Rising now.", concept: "Only once the completion year is verified.", cta: "Comment FAENA for the price sheet", madeBy: DROPBOX },
  { date: "2026-12-22", slot: "6 pm", platforms: META, format: "Carousel", pillar: "Unit deconstruct", project: "The Residences at Mandarin Oriental, Miami", hook: "One residence, room by room", concept: "One residence line.", cta: "DM us for the price sheet", madeBy: CARDS },
  { date: "2026-12-23", slot: "1 pm", platforms: ALL, format: "Reel", pillar: "Spotlight", project: "UNA Miami", hook: "Brickell, on the bay", concept: "Waterfront tower opener.", cta: "DM us for the price sheet", madeBy: DROPBOX },
  { date: "2026-12-23", slot: "6 pm", platforms: ALL, format: "Reel", pillar: "Advisor answer", project: "Assignment before closing: what to check", hook: "Can you sell before closing?", concept: "What the contract allows, fees, timing. Not legal advice.", cta: "DM us your questions", madeBy: DAN },
  { date: "2026-12-24", slot: "10 am", platforms: ALL, format: "Reel", pillar: "Spotlight", project: "Ora by Casa Tua", hook: "Picture your evenings here", concept: "Short holiday cut, one feeling, no hard sell.", cta: "Comment ORA for the floor plans", madeBy: DROPBOX },
  { date: "2026-12-25", slot: "", platforms: "Stories only", format: "Off", pillar: "", project: "Christmas Day", hook: "", concept: "No feed post. Stories only, a calm holiday frame.", cta: "", madeBy: "" },
  { date: "2026-12-26", slot: "10 am", platforms: ALL, format: "Reel", pillar: "Progress vs rendering", project: "Cipriani Residences Miami", hook: "Rendered in 2023. Topped off.", concept: "Then vs now on the topped-off footage. Floors and completion only once verified.", cta: "Comment CIPRIANI for the price sheet", madeBy: DROPBOX },
  { date: "2026-12-27", slot: "10 am", platforms: META, format: "Carousel", pillar: "Spotlight recap", project: "Week in 5", hook: "This week's 5 projects", concept: RECAP, cta: "Comment the project name for its price sheet", madeBy: CARDS },
  { date: "2026-12-28", slot: "1 pm", platforms: ALL, format: "Reel", pillar: "Spotlight", project: "St Regis - Sunny Isles", hook: "Sunny Isles, on the ocean", concept: "Beachfront opener, service and view.", cta: "Comment STREGIS for the price sheet", madeBy: DROPBOX },
  { date: "2026-12-28", slot: "6 pm", platforms: META, format: "Carousel", pillar: "Floor plan", project: "HQ Residences Miami - Edgewater", hook: "Edgewater, room by room", concept: "Floor plan first, then view.", cta: "DM us for the floor plans", madeBy: CARDS },
  { date: "2026-12-29", slot: "1 pm", platforms: ALL, format: "Reel", pillar: "Progress vs rendering", project: "Kempinski - Miami", hook: "Rendered then. Rising now.", concept: "Or a spotlight if no construction footage exists.", cta: "DM us for the price sheet", madeBy: DROPBOX },
  { date: "2026-12-29", slot: "6 pm", platforms: META, format: "Carousel", pillar: "Unit deconstruct", project: "CasaBella - Miami", hook: "One residence, room by room", concept: "One residence line.", cta: "DM us for the price sheet", madeBy: CARDS },
  { date: "2026-12-30", slot: "1 pm", platforms: ALL, format: "Reel", pillar: "Spotlight", project: "Pagani Residences - Miami", hook: "Design you can live in", concept: "Design detail as the proposition.", cta: "DM us for the price sheet", madeBy: DROPBOX },
  { date: "2026-12-30", slot: "6 pm", platforms: ALL, format: "Reel", pillar: "Market proof", project: "Brickell sales up 36% with heavy inventory", hook: "Brickell sales up 36%", concept: "What heavy inventory means for pre-construction pricing.", cta: "Comment CIPRIANI for the price sheet", madeBy: FIGURE },
  { date: "2026-12-31", slot: "10 am", platforms: META, format: "Carousel", pillar: "Spotlight recap", project: "2026 in 10 projects", hook: "10 projects to know", concept: "One slide per project from the month. A shortlist to save for 2027.", cta: "Save this and DM us for the shortlist", madeBy: CARDS },
];

/**
 * Videos in Google Drive to preview on the Content page until each queue item carries its own drive_link.
 * Add a row for each draft cut; the page embeds Drive's own player, so only people with access to the file can play it.
 */
export const DRIVE_VIDEOS: { title: string; project: string; fileId: string; note: string }[] = [
  { title: "Cipriani Reel v3, draft", project: "Cipriani Residences Miami", fileId: "10uyoQOXA7IXI2PZarAWKrBMvXfP1Lurh", note: "Draft cut for review. Not posted." },
  { title: "Cipriani, Topped Off Reel, draft for approval", project: "Cipriani Residences Miami", fileId: "1VDC7PQDIhnnnWbbR9iCW1K4QOhSTh_th", note: "Draft cut for review. Not posted." },
];

/** Turn a Drive file link or id into its embeddable player address. Returns null for anything that isn't Drive. */
export function drivePreview(linkOrId: string | null | undefined): string | null {
  if (!linkOrId) return null;
  if (/^[\w-]{20,}$/.test(linkOrId)) return `https://drive.google.com/file/d/${linkOrId}/preview`;
  const m = linkOrId.match(/^https:\/\/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]{20,})/);
  return m ? `https://drive.google.com/file/d/${m[1]}/preview` : null;
}
