import Link from "next/link";
import { notFound } from "next/navigation";
import { RunActions } from "@/components/Controls";
import { RunPill } from "@/components/Status";
import { getExecutionDetail } from "@/lib/data";
import { duration, when } from "@/lib/format";
import { n8nLink, snapshot, wfName } from "@/lib/view";

export default async function RunDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const s = await snapshot();
  let d;
  try {
    d = await getExecutionDetail(id);
  } catch (e) {
    return <div className="banner glass bad"><span className="dot bad" /><span>{e instanceof Error ? e.message : "Couldn't load this run."}</span></div>;
  }
  if (!d) notFound();
  const link = n8nLink(s, `/workflow/${d.workflowId}/executions/${d.id}`);
  const failed = d.status === "error" || d.status === "crashed";

  return (
    <>
      <header className="top">
        <div>
          <div className="eyebrow"><Link className="link" href="/runs">← Runs</Link></div>
          <h1>Run #{d.id}</h1>
          <p>{wfName(s, d.workflowId)}</p>
        </div>
        <div className="row-actions">
          <RunActions id={d.id} status={d.status} />
          {link && <a className="btn" href={link} target="_blank" rel="noreferrer">Open in n8n</a>}
        </div>
      </header>

      <section className="grid two">
        <div className="card glass">
          <div className="card-head"><h2>{failed ? "What went wrong" : "Summary"}</h2><RunPill status={d.status} /></div>
          {failed ? (
            d.errorMessage ? (
              <>
                <div style={{ fontSize: 16, lineHeight: 1.5 }}>{d.errorMessage}</div>
                {d.errorNode && <div className="muted small" style={{ marginTop: 8 }}>Stopped at step “{d.errorNode}”.</div>}
              </>
            ) : (
              <div className="sub">n8n didn&apos;t return an error message for this run{s.mode === "preview" ? " in the preview snapshot" : ""}. Open it in n8n to see the full trace.</div>
            )
          ) : (
            <div className="sub">Finished {d.status === "success" ? "cleanly" : `as ${d.status}`}{d.lastNode ? `, last step “${d.lastNode}”` : ""}.</div>
          )}
          <dl className="kv" style={{ marginTop: 20 }}>
            <dt>Started</dt><dd>{when(d.startedAt)}</dd>
            <dt>Took</dt><dd>{duration(d.startedAt, d.stoppedAt)}</dd>
            <dt>Triggered by</dt><dd>{d.mode}</dd>
            {d.retryOf && (<><dt>Retry of</dt><dd><Link className="link" href={`/runs/${d.retryOf}`}>#{d.retryOf}</Link></dd></>)}
          </dl>
        </div>
        <div className="card glass">
          <div className="card-head"><h2>Steps</h2><span className="muted small">{d.nodes.length} ran</span></div>
          {d.nodes.length === 0 ? (
            <div className="sub">{s.mode === "preview" ? "Step details aren't in the preview snapshot for this run." : "No step data was saved for this run."}</div>
          ) : (
            <div className="list">
              {d.nodes.map((n) => (
                <div key={n.name} className="li">
                  <span className={`dot ${n.status === "error" ? "bad" : n.status === "success" ? "ok" : ""}`} />
                  <div className="grow"><div className="name">{n.name}</div></div>
                  <span className="muted small num">{n.ms} ms</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
