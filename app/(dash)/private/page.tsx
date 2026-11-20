import { notFound } from "next/navigation";
import { AddTodo, DeleteTodo, TodoSwitch } from "@/components/Controls";
import { currentUser } from "@/lib/auth";
import { getPrivateTodos } from "@/lib/data";
import { when } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "My to-do · Agent Desk" };

export default async function PrivateTodo() {
  const user = await currentUser();
  // Admin only, checked on the server. Anyone else gets a plain 404, so the page doesn't show it exists.
  if (!user || user.role !== "admin") notFound();
  const { todos, error } = await getPrivateTodos(user.email);
  const open = todos.filter((t) => !t.done).sort((a, b) => a.at.localeCompare(b.at));
  const done = todos.filter((t) => t.done).sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));

  return (
    <>
      <header className="top">
        <div>
          <div className="eyebrow">Private · {user.name}</div>
          <h1>My to-do</h1>
          <p>Only your login can open this list. Nobody else sees it, here or on any other page.</p>
        </div>
      </header>

      {error && <div className="banner glass bad"><b>Your list didn&apos;t load.</b> {error}</div>}

      <section className="glass card">
        <AddTodo mine />
      </section>

      <section className="glass card">
        <div className="card-head"><h2>Open</h2><span className="muted small">{open.length} left</span></div>
        {open.length === 0 ? (
          <p className="muted">Nothing open.</p>
        ) : (
          <div className="list">
            {open.map((t) => (
              <div key={t.id} className="li todo">
                <TodoSwitch id={t.id} title={t.title} done={false} mine />
                <div className="grow">
                  <div className="name">{t.title}</div>
                  {t.note && <div className="todo-note">{t.note}</div>}
                  <div className="meta">Added {t.at ? when(t.at) : ""}</div>
                </div>
                <DeleteTodo id={t.id} title={t.title} />
              </div>
            ))}
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section className="glass card">
          <div className="card-head"><h2>Done</h2><span className="muted small">{done.length}</span></div>
          <div className="list">
            {done.map((t) => (
              <div key={t.id} className="li todo done">
                <TodoSwitch id={t.id} title={t.title} done mine />
                <div className="grow">
                  <div className="name">{t.title}</div>
                  <div className="meta">{t.doneAt ? `Done ${when(t.doneAt)}` : "Done"}</div>
                </div>
                <DeleteTodo id={t.id} title={t.title} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
