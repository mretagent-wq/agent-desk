"use client";
import { useEffect, useState } from "react";

/**
 * Screen-size toggle in the sidebar. Auto picks the layout from the window width, so moving the
 * window to a big monitor switches it on its own; Laptop and Wide force one. The choice is kept per browser.
 * The script in app/layout.tsx applies it before the first paint; this only reads and changes it.
 */
type View = "auto" | "laptop" | "wide";
const OPTIONS: { id: View; label: string; hint: string }[] = [
  { id: "auto", label: "Auto", hint: "Picks the layout from the window size" },
  { id: "laptop", label: "Laptop", hint: "Laptop layout on any screen" },
  { id: "wide", label: "Wide", hint: "Fills a big or ultrawide monitor" },
];

declare global {
  interface Window { __deskView?: (v: View) => void }
}

export default function ViewToggle() {
  const [view, setView] = useState<View>("auto");
  const [layout, setLayout] = useState<string>("");

  useEffect(() => {
    const d = document.documentElement;
    const read = () => {
      setView(((d.dataset.view as View) || "auto"));
      setLayout(d.dataset.layout || "");
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(d, { attributes: true, attributeFilter: ["data-view", "data-layout"] });
    return () => obs.disconnect();
  }, []);

  const pick = (v: View) => {
    if (window.__deskView) window.__deskView(v);
    else {
      const d = document.documentElement;
      d.dataset.view = v;
      d.dataset.layout = v === "auto" ? (window.innerWidth >= 1800 ? "wide" : "laptop") : v;
      try { localStorage.setItem("desk-view", v); } catch {}
    }
  };

  return (
    <div className="viewtog">
      <div className="viewtog-label">
        Screen{view === "auto" && layout ? <span> · {layout === "wide" ? "wide" : "laptop"} now</span> : null}
      </div>
      <div className="seg" role="radiogroup" aria-label="Screen layout">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={view === o.id}
            title={o.hint}
            className={view === o.id ? "on" : ""}
            onClick={() => pick(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
