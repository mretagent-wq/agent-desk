"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ViewToggle from "./ViewToggle";
import { IconAgents, IconContent, IconFlows, IconHome, IconInbox, IconLock, IconRuns, IconTeam, IconTodo } from "./Icons";
import ProfileCircle from "./ProfileCircle";

export default function Sidebar({ pending, who, title, admin, preview, photo = null }: { pending: number; who: string; title: string; admin: boolean; preview: boolean; photo?: string | null }) {
  const path = usePathname();
  const items = [
    { href: "/", label: "Overview", icon: <IconHome /> },
    { href: "/approvals", label: "Approvals", icon: <IconInbox />, count: pending },
    ...(admin ? [{ href: "/private", label: "My to-do", icon: <IconLock /> }] : []),
    { href: "/todo", label: "To-do", icon: <IconTodo /> },
    { href: "/team", label: "Team", icon: <IconTeam /> },
    { href: "/content", label: "Content", icon: <IconContent /> },
    { href: "/agents", label: "Agents", icon: <IconAgents /> },
    { href: "/workflows", label: "Workflows", icon: <IconFlows /> },
    { href: "/runs", label: "Runs", icon: <IconRuns /> },
  ];
  return (
    <aside className="side glass">
      <div className="brand">
        <b>Agent Desk</b>
        <span>MRET 1 · n8n</span>
      </div>
      <nav className="nav">
        {items.map((i) => {
          const on = i.href === "/" ? path === "/" : path.startsWith(i.href);
          return (
            <Link key={i.href} href={i.href} className={on ? "on" : ""}>
              {i.icon}
              <span>{i.label}</span>
              {i.count ? <span className="count">{i.count}</span> : null}
            </Link>
          );
        })}
      </nav>
      <div className="side-foot">
        <ViewToggle />
        <div className="who-row">
          <ProfileCircle name={who} photo={photo} size={30} />
          <div>
            <div className="who">{who}</div>
            {title && <div className="who-title">{title}</div>}
          </div>
        </div>
        {preview ? <div>Local preview</div> : <a href="/api/auth/signout">Sign out</a>}
      </div>
    </aside>
  );
}
