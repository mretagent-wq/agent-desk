"use client";
import { signIn } from "next-auth/react";

export default function LoginButton({ callbackUrl }: { callbackUrl: string }) {
  return (
    <button className="btn primary" style={{ width: "100%", height: 44 }} onClick={() => signIn("google", { callbackUrl })}>
      Continue with Google
    </button>
  );
}
