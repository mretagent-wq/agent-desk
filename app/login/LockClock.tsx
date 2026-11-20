"use client";
import { useEffect, useState } from "react";

/** The date and the large time over the lock screen, as on a Mac. Drawn after load so it shows the viewer's own clock. */
export default function LockClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <div className="lock-clock" aria-hidden />;
  const day = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const time = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M$/i, "");
  return (
    <div className="lock-clock">
      <div className="lock-day">{day}</div>
      <div className="lock-time">{time}</div>
    </div>
  );
}
