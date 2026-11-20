"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";

/** The Mac password field, reimagined as one Google sign-in pill with the round arrow at its end. */
export default function LoginButton({ callbackUrl }: { callbackUrl: string }) {
  const [busy, setBusy] = useState(false);
  const go = () => {
    if (busy) return;
    setBusy(true);
    signIn("google", { callbackUrl: `/welcome?next=${encodeURIComponent(callbackUrl)}` });
  };
  return (
    <button type="button" className={`mac-field${busy ? " busy" : ""}`} onClick={go} aria-label="Continue with Google" autoFocus>
      <span className="mac-g" aria-hidden>
        <svg viewBox="0 0 18 18" width="16" height="16">
          <path fill="#fff" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" opacity=".95" />
          <path fill="#fff" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" opacity=".8" />
          <path fill="#fff" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" opacity=".65" />
          <path fill="#fff" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" opacity=".9" />
        </svg>
      </span>
      <span className="mac-label">{busy ? "Opening Google…" : "Continue with Google"}</span>
      <span className="mac-go" aria-hidden>
        {busy ? <span className="mac-spin" /> : (
          <svg viewBox="0 0 20 20" width="14" height="14"><path d="M4 10h11M10.5 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        )}
      </span>
    </button>
  );
}
