import "server-only";

/** Settings the live app needs. Names only; values are never read out. */
export const REQUIRED_ENV = [
  ["NEXTAUTH_SECRET", "Random secret for sign-in sessions"],
  ["GOOGLE_CLIENT_ID", "Google sign-in client ID"],
  ["GOOGLE_CLIENT_SECRET", "Google sign-in client secret"],
  ["ALLOWED_EMAILS", "Google accounts allowed in, comma-separated"],
  ["N8N_BASE_URL", "Your n8n address"],
  ["N8N_API_KEY", "n8n API key"],
] as const;

export function missingEnv(): { name: string; what: string }[] {
  return REQUIRED_ENV.filter(([k]) => !process.env[k]?.trim()).map(([name, what]) => ({ name, what }));
}
