import type { Execution } from "@/lib/types";

/** Runs per hour for the last 24 hours. Failed hours are tinted. */
export default function Bars({ executions, now }: { executions: Execution[]; now: number }) {
  const hours = 24;
  const buckets = Array.from({ length: hours }, () => ({ n: 0, err: 0 }));
  for (const e of executions) {
    const age = (now - new Date(e.startedAt).getTime()) / 3600000;
    if (age < 0 || age >= hours) continue;
    const b = buckets[hours - 1 - Math.floor(age)];
    b.n++;
    if (e.status === "error" || e.status === "crashed") b.err++;
  }
  const max = Math.max(1, ...buckets.map((b) => b.n));
  return (
    <div>
      <div className="bars" role="img" aria-label="Runs per hour, last 24 hours">
        {buckets.map((b, i) => (
          <span
            key={i}
            className={b.n === 0 ? "zero" : b.err ? "err" : ""}
            style={{ height: `${Math.max(3, (b.n / max) * 100)}%` }}
            title={`${b.n} run${b.n === 1 ? "" : "s"}${b.err ? `, ${b.err} failed` : ""}`}
          />
        ))}
      </div>
      <div className="axis"><span>24h ago</span><span>12h</span><span>now</span></div>
    </div>
  );
}
