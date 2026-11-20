"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Jarvis voice console. Browser mic <-> OpenAI Realtime over WebRTC. The page asks our server for a
 * two-minute client secret (the API key never reaches the browser), and every tool call Jarvis makes
 * is run by our server for the signed-in person. Read-only: reporting and context, no changes.
 */

type Phase = "idle" | "connecting" | "listening" | "hearing" | "thinking" | "speaking" | "error";
interface Line { id: string; who: "you" | "jarvis"; text: string; done: boolean }
interface ToolChip { id: string; label: string; done: boolean }

const TOOL_LABEL: Record<string, string> = {
  desk_summary: "Reading the desk",
  list_workflows: "Checking workflows",
  recent_runs: "Checking recent runs",
  run_detail: "Opening that run",
  approvals_queue: "Reading approvals",
  agents_status: "Checking agents",
  team_roster: "Reading the team",
  desk_requests: "Reading the request log",
  shared_todos: "Reading the to-do list",
  my_private_todos: "Reading your to-do list",
  content_plan: "Reading the content plan",
  recent_changes: "Reading recent changes",
  outside_agents: "Checking outside agents",
};

const PHASE_LABEL: Record<Phase, string> = {
  idle: "Tap to talk",
  connecting: "Connecting",
  listening: "Listening",
  hearing: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  error: "Something went wrong",
};

export default function Jarvis({ first, ready }: { first: string; ready: boolean }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [lines, setLines] = useState<Line[]>([]);
  const [tools, setTools] = useState<ToolChip[]>([]);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const pc = useRef<RTCPeerConnection | null>(null);
  const dc = useRef<RTCDataChannel | null>(null);
  const mic = useRef<MediaStream | null>(null);
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const micAn = useRef<AnalyserNode | null>(null);
  const outAn = useRef<AnalyserNode | null>(null);
  const pending = useRef(new Map<string, Promise<void>[]>());
  const phaseRef = useRef<Phase>("idle");
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const feed = useRef<HTMLDivElement | null>(null);

  const go = (p: Phase) => { phaseRef.current = p; setPhase(p); };
  const live = phase !== "idle" && phase !== "connecting" && phase !== "error";

  const send = (ev: Record<string, unknown>) => { if (dc.current?.readyState === "open") dc.current.send(JSON.stringify(ev)); };

  const upsert = useCallback((id: string, who: Line["who"], text: string, mode: "append" | "set", done = false) => {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.id === id);
      if (i < 0) return [...ls, { id, who, text, done }].slice(-60);
      const next = [...ls];
      next[i] = { ...next[i], text: mode === "append" ? next[i].text + text : text, done: done || next[i].done };
      return next;
    });
  }, []);

  const stop = useCallback(() => {
    try { dc.current?.close(); } catch {}
    try { pc.current?.close(); } catch {}
    mic.current?.getTracks().forEach((t) => t.stop());
    try { ctx.current?.close(); } catch {}
    dc.current = null; pc.current = null; mic.current = null; ctx.current = null; micAn.current = null; outAn.current = null;
    pending.current.clear();
    setMuted(false);
    go("idle");
  }, []);

  useEffect(() => () => stop(), [stop]);
  useEffect(() => { feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: "smooth" }); }, [lines, tools]);

  async function runTool(responseId: string, callId: string, name: string, args: string) {
    const chip = { id: callId, label: TOOL_LABEL[name] ?? "Looking that up", done: false };
    setTools((t) => [...t, chip].slice(-6));
    let output = "";
    try {
      const r = await fetch("/api/jarvis/tool", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, args }) });
      const j = (await r.json()) as { result?: unknown; error?: string };
      output = JSON.stringify(j.result ?? { error: j.error ?? "No answer." });
    } catch {
      output = JSON.stringify({ error: "The desk didn't answer." });
    }
    send({ type: "conversation.item.create", item: { type: "function_call_output", call_id: callId, output: output.slice(0, 24000) } });
    setTools((t) => t.map((c) => (c.id === callId ? { ...c, done: true } : c)));
    void responseId;
  }

  function onEvent(raw: string) {
    let e: Record<string, any>;
    try { e = JSON.parse(raw); } catch { return; }
    switch (e.type) {
      case "input_audio_buffer.speech_started":
        go("hearing");
        break;
      case "input_audio_buffer.speech_stopped":
        go("thinking");
        break;
      case "conversation.item.input_audio_transcription.delta":
        upsert(e.item_id, "you", e.delta ?? "", "append");
        break;
      case "conversation.item.input_audio_transcription.completed":
        if (e.transcript?.trim()) upsert(e.item_id, "you", e.transcript.trim(), "set", true);
        break;
      case "response.created":
        if (phaseRef.current !== "speaking") go("thinking");
        break;
      case "output_audio_buffer.started":
        go("speaking");
        break;
      case "output_audio_buffer.stopped":
        go("listening");
        break;
      case "response.output_audio_transcript.delta":
        upsert(e.item_id, "jarvis", e.delta ?? "", "append");
        break;
      case "response.output_audio_transcript.done":
        upsert(e.item_id, "jarvis", e.transcript ?? "", "set", true);
        break;
      case "response.function_call_arguments.done": {
        const list = pending.current.get(e.response_id) ?? [];
        list.push(runTool(e.response_id, e.call_id, e.name, e.arguments ?? "{}"));
        pending.current.set(e.response_id, list);
        break;
      }
      case "response.done": {
        const id = e.response?.id ?? e.response_id;
        const list = id ? pending.current.get(id) : undefined;
        if (list?.length) {
          pending.current.delete(id);
          Promise.all(list).then(() => send({ type: "response.create" }));
        } else if (phaseRef.current === "thinking") {
          // Nothing will play (for example a text-only turn), so go back to listening.
          setTimeout(() => { if (phaseRef.current === "thinking") go("listening"); }, 600);
        }
        if (e.response?.status === "failed") setError(e.response?.status_details?.error?.message ?? "Jarvis couldn't answer that one.");
        break;
      }
      case "error":
        setError(e.error?.message ?? "Jarvis hit an error.");
        break;
    }
  }

  async function start() {
    if (!ready) { setError("Jarvis isn't connected yet. An OpenAI key needs to be added in Netlify."); go("error"); return; }
    setError(null);
    go("connecting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      mic.current = stream;

      const sres = await fetch("/api/jarvis/session", { method: "POST" });
      const s = (await sres.json()) as { secret?: string; error?: string };
      if (!sres.ok || !s.secret) throw new Error(s.error ?? "Couldn't start Jarvis.");

      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ac = new AC();
      ctx.current = ac;
      const ma = ac.createAnalyser(); ma.fftSize = 512; ma.smoothingTimeConstant = 0.8;
      ac.createMediaStreamSource(stream).connect(ma);
      micAn.current = ma;

      const peer = new RTCPeerConnection();
      pc.current = peer;
      peer.ontrack = (ev) => {
        const remote = ev.streams[0];
        if (audioEl.current) { audioEl.current.srcObject = remote; void audioEl.current.play().catch(() => {}); }
        try {
          const oa = ac.createAnalyser(); oa.fftSize = 512; oa.smoothingTimeConstant = 0.75;
          ac.createMediaStreamSource(remote).connect(oa);
          outAn.current = oa;
        } catch {}
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "failed" || peer.connectionState === "disconnected") { setError("The call dropped."); stop(); }
      };
      stream.getTracks().forEach((t) => peer.addTrack(t, stream));

      const channel = peer.createDataChannel("oai-events");
      dc.current = channel;
      channel.onmessage = (m) => onEvent(String(m.data));
      channel.onopen = () => {
        go("listening");
        send({ type: "response.create", response: { instructions: `Greet ${first} in one short, warm sentence as Jarvis and ask what they want to know. Do not call any tools yet.` } });
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const ans = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: { Authorization: `Bearer ${s.secret}`, "Content-Type": "application/sdp" },
      });
      if (!ans.ok) throw new Error(`OpenAI refused the call (${ans.status}).`);
      await peer.setRemoteDescription({ type: "answer", sdp: await ans.text() });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't start Jarvis.";
      stop();
      setError(/denied|NotAllowed/i.test(msg) ? "Microphone access was blocked. Allow the mic for this site and try again." : msg);
      go("error");
    }
  }

  function toggleMute() {
    const next = !muted;
    mic.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }

  function sendText(ev: React.FormEvent) {
    ev.preventDefault();
    const text = draft.trim();
    if (!text || !live) return;
    setDraft("");
    upsert(`typed-${Date.now()}`, "you", text, "set", true);
    send({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text }] } });
    send({ type: "response.create" });
    go("thinking");
  }

  /* ---------- orb ---------- */
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const g = c.getContext("2d");
    if (!g) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const buf = new Uint8Array(256);
    let raf = 0;
    let level = 0;
    let t0 = performance.now();
    const level01 = (an: AnalyserNode | null) => {
      if (!an) return 0;
      an.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      return Math.min(1, Math.sqrt(sum / buf.length) * 4.2);
    };
    const draw = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = c.clientWidth;
      if (c.width !== Math.round(size * dpr)) { c.width = Math.round(size * dpr); c.height = Math.round(size * dpr); }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, size, size);
      const p = phaseRef.current;
      const t = (now - t0) / 1000 * (reduce ? 0.35 : 1);
      const src = p === "speaking" ? outAn.current : p === "hearing" || p === "listening" ? micAn.current : null;
      const target = src ? level01(src) : p === "thinking" ? 0.18 + 0.08 * Math.sin(t * 3) : p === "connecting" ? 0.12 : 0.05;
      level += (target - level) * 0.18;

      const cx = size / 2, cy = size / 2;
      const base = size * 0.25 * (1 + level * 0.22 + 0.015 * Math.sin(t * 1.6));
      const speak = p === "speaking";
      const warm = p === "thinking";

      // Halo
      const haloR = Math.min(base * 2.1, size / 2);
      const halo = g.createRadialGradient(cx, cy, base * 0.6, cx, cy, haloR);
      halo.addColorStop(0, speak ? `rgba(142,227,226,${0.34 + level * 0.3})` : warm ? "rgba(244,231,200,0.24)" : "rgba(142,227,226,0.18)");
      halo.addColorStop(1, "rgba(142,227,226,0)");
      g.fillStyle = halo;
      g.beginPath(); g.arc(cx, cy, haloR, 0, Math.PI * 2); g.fill();

      // Fluid layers
      const layers = [
        { k: 1.0, sp: 0.6, amp: 0.07, col: ["rgba(92,201,204,0.95)", "rgba(12,74,86,0.95)"] },
        { k: 0.86, sp: -0.9, amp: 0.1, col: [warm ? "rgba(244,231,200,0.75)" : "rgba(168,236,234,0.7)", "rgba(92,201,204,0)"] },
        { k: 0.62, sp: 1.3, amp: 0.14, col: ["rgba(255,255,255,0.55)", "rgba(230,209,163,0)"] },
      ];
      for (const L of layers) {
        const r = base * L.k;
        g.beginPath();
        const steps = 96;
        for (let i = 0; i <= steps; i++) {
          const a = (i / steps) * Math.PI * 2;
          const wob = Math.sin(a * 3 + t * L.sp * 2) * 0.5 + Math.sin(a * 5 - t * L.sp * 1.3) * 0.3 + Math.sin(a * 2 + t * 0.7) * 0.2;
          const rr = r * (1 + wob * L.amp * (0.35 + level * 1.6));
          const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        const off = r * 0.35;
        const grd = g.createRadialGradient(cx - off * Math.cos(t * L.sp), cy - off * Math.sin(t * L.sp) - r * 0.2, r * 0.05, cx, cy, r * 1.15);
        grd.addColorStop(0, L.col[0]);
        grd.addColorStop(1, L.col[1]);
        g.fillStyle = grd;
        g.fill();
      }

      // Glass rim and highlight
      g.lineWidth = 1.2;
      g.strokeStyle = `rgba(255,255,255,${0.28 + level * 0.3})`;
      g.beginPath(); g.arc(cx, cy, base * 1.08, 0, Math.PI * 2); g.stroke();
      const hl = g.createRadialGradient(cx - base * 0.35, cy - base * 0.5, 0, cx - base * 0.35, cy - base * 0.5, base * 0.6);
      hl.addColorStop(0, "rgba(255,255,255,0.45)");
      hl.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = hl;
      g.beginPath(); g.arc(cx, cy, base, 0, Math.PI * 2); g.fill();

      // Thinking ring
      if (warm || p === "connecting") {
        g.lineWidth = 2;
        g.strokeStyle = "rgba(244,231,200,0.85)";
        g.beginPath();
        const s0 = t * 2.4;
        g.arc(cx, cy, base * 1.22, s0, s0 + Math.PI * 0.55);
        g.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const activeTool = tools.find((x) => !x.done);
  const label = activeTool && live ? activeTool.label : muted && live ? "Muted" : PHASE_LABEL[phase];

  return (
    <div className="jv">
      <section className="jv-stage glass">
        <button className={`jv-orb ${phase}`} onClick={() => (live || phase === "connecting" ? undefined : start())} aria-label={live ? "Jarvis is on" : "Start talking to Jarvis"} disabled={phase === "connecting"}>
          <canvas ref={canvas} />
        </button>
        <div className="jv-state" aria-live="polite">
          <span className={`jv-dot ${phase}`} />
          {label}
        </div>
        {error && <div className="jv-err">{error}</div>}
        <div className="jv-ctl">
          {!live ? (
            <button className="btn primary jv-go" onClick={start} disabled={phase === "connecting"}>
              {phase === "connecting" ? "Connecting" : "Talk to Jarvis"}
            </button>
          ) : (
            <>
              <button className={`btn jv-round ${muted ? "on" : ""}`} onClick={toggleMute} aria-pressed={muted} title={muted ? "Unmute" : "Mute"}>
                {muted ? <MicOff /> : <Mic />}
              </button>
              <button className="btn jv-round jv-end" onClick={stop} title="End">
                <EndIcon />
              </button>
            </>
          )}
        </div>
        <p className="jv-fine">Jarvis reads the desk and reports. Changes go through Claude in chat.</p>
      </section>

      <section className="jv-feed glass">
        <div className="jv-feed-head">
          <b>Conversation</b>
          {lines.length > 0 && !live && <button className="link" onClick={() => { setLines([]); setTools([]); }}>Clear</button>}
        </div>
        <div className="jv-lines" ref={feed}>
          {lines.length === 0 && (
            <div className="jv-empty">
              <span>Try asking</span>
              <ul>
                <li>What needs my yes today?</li>
                <li>Did anything break overnight?</li>
                <li>Which agents are still drafts?</li>
                <li>What&apos;s posting next week?</li>
              </ul>
            </div>
          )}
          {lines.filter((l) => l.text.trim()).map((l) => (
            <div key={l.id} className={`jv-line ${l.who}`}>
              <span>{l.text}</span>
            </div>
          ))}
          {tools.filter((x) => !x.done).map((x) => (
            <div key={x.id} className="jv-tool"><span className="jv-spin" />{x.label}</div>
          ))}
        </div>
        <form className="jv-type" onSubmit={sendText}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={live ? "Or type to Jarvis" : "Start a call to type"} disabled={!live} aria-label="Type to Jarvis" />
          <button className="btn" disabled={!live || !draft.trim()}>Send</button>
        </form>
      </section>
      <audio ref={audioEl} autoPlay playsInline hidden />
    </div>
  );
}

const ip = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, width: 20, height: 20 };
const Mic = () => (<svg viewBox="0 0 24 24" {...ip}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></svg>);
const MicOff = () => (<svg viewBox="0 0 24 24" {...ip}><path d="M9 9V6a3 3 0 0 1 5.6-1.5M15 10v1a3 3 0 0 1-4.5 2.6" /><path d="M5.5 11a6.5 6.5 0 0 0 10.6 5M18.5 11c0 .7-.1 1.3-.3 1.9M12 17.5V21M4 4l16 16" /></svg>);
const EndIcon = () => (<svg viewBox="0 0 24 24" {...ip}><path d="M3.5 14.5c4.7-4.2 12.3-4.2 17 0l-2.2 2.4-3.3-1.4v-2.6a11 11 0 0 0-6 0v2.6l-3.3 1.4z" /></svg>);
