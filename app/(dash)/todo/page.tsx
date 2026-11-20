import { AddTodo, TodoSwitch } from "@/components/Controls";
import { getTodos } from "@/lib/data";
import { when } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Todo() {
  const { todos, error } = await getTodos();
  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done).sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));

  return (
    <>
      <header className="top">
        <div>
          <div className="eyebrow">Nicholas and Dan</div>
          <h1>To-do</h1>
          <p>Setup steps and follow-ups for the agent desk. Flip the switch when one is done; it stays done for both of you.</p>
        </div>
      </header>

      {error && <div className="banner glass bad"><b>The to-do list didn&apos;t load.</b> {error}</div>}

      <section className="glass card">
        <AddTodo />
      </section>

      <section className="glass card">
        <div className="card-head"><h2>Open</h2><span className="muted small">{open.length} left</span></div>
        {open.length === 0 ? (
          <p className="muted">Nothing open.</p>
        ) : (
          <div className="list">
            {open.map((t) => (
              <div key={t.id} className="li todo">
                <TodoSwitch id={t.id} title={t.title} done={false} />
                <div className="grow">
                  <div className="name">{t.title}</div>
                  {t.note && <div className="todo-note">{t.note}</div>}
                  <div className="meta">{t.by ? `Added by ${t.by}` : "Added"}{t.at ? `, ${when(t.at)}` : ""}</div>
                </div>
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
                <TodoSwitch id={t.id} title={t.title} done />
                <div className="grow">
                  <div className="name">{t.title}</div>
                  <div className="meta">{t.doneAt ? `Done ${when(t.doneAt)}` : "Done"}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
