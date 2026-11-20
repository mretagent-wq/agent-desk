"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileCircle from "@/components/ProfileCircle";

export default function Unlock({ name, photo, next }: { name: string; photo: string | null; next: string }) {
  const router = useRouter();
  const [out, setOut] = useState(false);
  const first = name.split(/\s+/)[0];
  useEffect(() => {
    fetch("/api/remember", { method: "POST" }).catch(() => {});
    router.prefetch(next);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const a = setTimeout(() => setOut(true), still ? 500 : 1500);
    const b = setTimeout(() => router.replace(next), still ? 650 : 2050);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [next, router]);
  return (
    <div className={`login mac unlock${out ? " out" : ""}`}>
      <div className="mac-user">
        <span className="unlock-ring"><ProfileCircle name={name} photo={photo} size={132} /></span>
        <div className="mac-name">{name}</div>
        <div className="mac-note">Welcome back, {first}</div>
      </div>
    </div>
  );
}
