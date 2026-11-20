import type { ExecStatus } from "@/lib/types";

const MAP: Record<ExecStatus, [string, string]> = {
  success: ["ok", "Succeeded"],
  error: ["bad", "Failed"],
  crashed: ["bad", "Crashed"],
  canceled: ["", "Canceled"],
  running: ["info", "Running"],
  waiting: ["warn", "Waiting"],
  new: ["info", "Queued"],
  unknown: ["", "Unknown"],
};

export function RunPill({ status }: { status: ExecStatus }) {
  const [tone, label] = MAP[status] ?? ["", status];
  return (
    <span className={`pill ${tone}`}>
      <span className={`dot ${tone} ${status === "running" ? "pulse" : ""}`} />
      {label}
    </span>
  );
}

export function LivePill({ live, draftLabel = "Paused" }: { live: boolean; draftLabel?: string }) {
  return live ? (
    <span className="pill ok"><span className="dot ok pulse" />Live</span>
  ) : (
    <span className="pill"><span className="dot" />{draftLabel}</span>
  );
}
