"use client";
import { useState, useTransition } from "react";
import { addPrivateTodo, addTodo, decideApproval, pauseWorkflow, removePrivateTodo, toggleTodo, togglePrivateTodo, resumeWorkflow, retryRun, stopRun, type ActionResult } from "@/app/actions";

function useAction() {
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<ActionResult | null>(null);
  const fire = (fn: () => Promise<ActionResult>, after?: (r: ActionResult) => void) =>
    start(async () => {
      const r = await fn();
      setToast(r);
      after?.(r);
      setTimeout(() => setToast(null), 4200);
    });
  const node = toast ? (
    <div className="toast glass" role="status">
      <span className={`dot ${toast.ok ? "ok" : "bad"}`} />
      <span>{toast.message}</span>
    </div>
  ) : null;
  return { pending, fire, node };
}

function Confirm({ title, body, cta, danger, onYes, onNo }: { title: string; body: string; cta: string; danger?: boolean; onYes: () => void; onNo: () => void }) {
  return (
    <div className="scrim" onClick={onNo}>
      <div className="dialog glass" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3>{title}</h3>
        <p>{body}</p>
        <div className="row-actions" style={{ justifyContent: "flex-end" }}>
          <button className="btn ghost" onClick={onNo}>Cancel</button>
          <button className={`btn ${danger ? "danger" : "primary"}`} onClick={onYes} autoFocus>{cta}</button>
        </div>
      </div>
    </div>
  );
}

export function WorkflowSwitch({ id, name, active, usedBy }: { id: string; name: string; active: boolean; usedBy: string[] }) {
  const { pending, fire, node } = useAction();
  const [ask, setAsk] = useState(false);
  const pausing = active;
  const body = pausing
    ? `“${name}” stops running in production.${usedBy.length ? ` ${usedBy.join(" and ")} use${usedBy.length === 1 ? "s" : ""} it as a tool, so ${usedBy.length === 1 ? "that agent" : "those agents"} can't use it until you resume.` : ""} Nothing in the workflow is changed.`
    : `“${name}” goes live again on its last published version. Unpublished edits stay as drafts.`;
  return (
    <>
      <button
        className={`switch ${active ? "on" : ""}`}
        aria-label={active ? `Pause ${name}` : `Resume ${name}`}
        aria-pressed={active}
        disabled={pending}
        onClick={() => setAsk(true)}
      />
      {ask && (
        <Confirm
          title={pausing ? "Pause this workflow?" : "Resume this workflow?"}
          body={body}
          cta={pausing ? "Pause" : "Resume"}
          danger={pausing}
          onNo={() => setAsk(false)}
          onYes={() => {
            setAsk(false);
            fire(() => (pausing ? pauseWorkflow(id) : resumeWorkflow(id)));
          }}
        />
      )}
      {node}
    </>
  );
}

export function RunActions({ id, status, compact }: { id: string; status: string; compact?: boolean }) {
  const { pending, fire, node } = useAction();
  const cls = `btn ${compact ? "sm" : ""}`;
  return (
    <>
      {(status === "error" || status === "crashed") && (
        <button className={cls} disabled={pending} onClick={() => fire(() => retryRun(id))}>Retry</button>
      )}
      {(status === "running" || status === "waiting" || status === "new") && (
        <button className={`${cls} danger`} disabled={pending} onClick={() => fire(() => stopRun(id))}>Stop</button>
      )}
      {node}
    </>
  );
}

export function ApprovalActions({ sourceId, rowId, approveLabel }: { sourceId: string; rowId: number; approveLabel: string }) {
  const { pending, fire, node } = useAction();
  const [ask, setAsk] = useState<null | "approve" | "reject">(null);
  return (
    <div className="row-actions">
      <button className="btn primary" disabled={pending} onClick={() => setAsk("approve")}>{approveLabel}</button>
      <button className="btn" disabled={pending} onClick={() => setAsk("reject")}>Request changes</button>
      {ask && (
        <Confirm
          title={ask === "approve" ? "Approve this?" : "Send it back?"}
          body={
            ask === "approve"
              ? "This marks it approved in n8n. Nothing is posted or published from here; the agent's next step still runs in n8n."
              : "This marks it as needing changes in n8n so the agent can rework it."
          }
          cta={ask === "approve" ? "Approve" : "Request changes"}
          onNo={() => setAsk(null)}
          onYes={() => {
            const d = ask;
            setAsk(null);
            fire(() => decideApproval(sourceId, rowId, d));
          }}
        />
      )}
      {node}
    </div>
  );
}

export function TodoSwitch({ id, title, done, mine }: { id: number; title: string; done: boolean; mine?: boolean }) {
  const { pending, fire, node } = useAction();
  const [on, setOn] = useState(done);
  return (
    <>
      <button
        className={`switch ${on ? "on" : ""}`}
        aria-label={on ? `Mark “${title}” not done` : `Mark “${title}” done`}
        aria-pressed={on}
        disabled={pending}
        onClick={() => {
          const next = !on;
          setOn(next);
          fire(() => (mine ? togglePrivateTodo(id, next) : toggleTodo(id, next)), (r) => { if (!r.ok) setOn(!next); });
        }}
      />
      {node}
    </>
  );
}

export function AddTodo({ mine }: { mine?: boolean } = {}) {
  const { pending, fire, node } = useAction();
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  return (
    <form
      className="todo-add"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        fire(() => (mine ? addPrivateTodo(title, note) : addTodo(title, note)), (r) => { if (r.ok) { setTitle(""); setNote(""); } });
      }}
    >
      <input className="input" placeholder="Add a to-do" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
      <input className="input" placeholder="Details (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
      <button className="btn primary" disabled={pending || !title.trim()}>Add</button>
      {node}
    </form>
  );
}

export function DeleteTodo({ id, title }: { id: number; title: string }) {
  const { pending, fire, node } = useAction();
  const [ask, setAsk] = useState(false);
  return (
    <>
      <button className="btn ghost sm" disabled={pending} onClick={() => setAsk(true)} aria-label={`Delete “${title}”`}>Delete</button>
      {ask && (
        <Confirm
          title="Delete this item?"
          body={`“${title}” comes off your list.`}
          cta="Delete"
          danger
          onNo={() => setAsk(false)}
          onYes={() => {
            setAsk(false);
            fire(() => removePrivateTodo(id));
          }}
        />
      )}
      {node}
    </>
  );
}
