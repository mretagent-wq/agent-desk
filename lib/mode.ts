/** Preview mode: local only. Never on Vercel or Netlify, so a deployed app always requires sign-in and live data. */
export function isPreview(): boolean {
  return process.env.PREVIEW_MODE === "1" && !process.env.VERCEL && !process.env.NETLIFY;
}
