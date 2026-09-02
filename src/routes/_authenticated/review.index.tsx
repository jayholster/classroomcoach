import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Chip, btn, btnPrimary } from "@/components/AppShell";
import { listRehearsalSessions } from "@/lib/api/rehearsal.functions";

export const Route = createFileRoute("/_authenticated/review/")({
  head: () => ({
    meta: [
      { title: "After-Action Review — Classroom Coach" },
      { name: "description", content: "Review recorded rehearsals and what changed during each one." },
      { property: "og:title", content: "After-Action Review — Classroom Coach" },
      { property: "og:description", content: "Evidence-based review built from the recorded rehearsal event log." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReviewIndex,
});

type Filter = "all" | "open" | "done";

function friendlyDate(value: string) {
  const d = new Date(value);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today, ${time}`;
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}, ${time}`;
}

function ReviewIndex() {
  const fetchSessions = useServerFn(listRehearsalSessions);
  const { data, isPending, error } = useQuery({ queryKey: ["sessions"], queryFn: () => fetchSessions() });
  const [filter, setFilter] = useState<Filter>("all");

  const sessions = useMemo(() => data ?? [], [data]);
  const open = sessions.filter((s) => !s.ended_at);
  const done = sessions.filter((s) => s.ended_at);
  const shown = filter === "open" ? open : filter === "done" ? done : sessions;

  const filters: [Filter, string, number][] = [
    ["all", "All rehearsals", sessions.length],
    ["open", "In progress", open.length],
    ["done", "Completed", done.length],
  ];

  return (
    <AppShell>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-primary">
        After-Action Review
      </h1>
      <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
        Open a rehearsal to see exactly what you did, what shifted in the room, and what to practise next. Every review
        is rebuilt from the recorded events — nothing is summarised while you rehearse.
      </p>

      {isPending ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading rehearsals…</p>
      ) : error ? (
        <p role="alert" className="mt-8 text-sm text-destructive">Unable to load rehearsals: {(error as Error).message}</p>
      ) : sessions.length === 0 ? (
        <div className="panel mt-8 p-8 text-center">
          <p className="text-base text-foreground">No rehearsals recorded yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">A review appears here as soon as you finish a rehearsal.</p>
          <Link to="/rehearse" className={`${btnPrimary} mt-5`}>
            Start a rehearsal
          </Link>
        </div>
      ) : (
        <>
          <div role="group" aria-label="Filter rehearsals" className="mt-8 flex flex-wrap gap-2">
            {filters.map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                className={`rounded-sm border px-3 py-2 text-sm transition-colors ${
                  filter === key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {label} <span className="opacity-70">({count})</span>
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              {filter === "open" ? "No rehearsals are in progress." : "No rehearsals have been completed yet."}
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              {shown.map((s) => (
                <li key={s.id} className="panel flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <div className="text-base font-medium text-foreground">{s.scenario_title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <Chip tone={s.ended_at ? "default" : "accent"}>{s.ended_at ? "Completed" : "In progress"}</Chip>
                      <span>Started {friendlyDate(s.started_at)}</span>
                      {s.ended_at && <span>· Ended {friendlyDate(s.ended_at)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!s.ended_at && (
                      <Link to="/rehearse/$id" params={{ id: s.id }} className={btn}>
                        Resume
                      </Link>
                    )}
                    <Link to="/review/$sessionId" params={{ sessionId: s.id }} className={btnPrimary}>
                      Open review
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </AppShell>
  );
}
