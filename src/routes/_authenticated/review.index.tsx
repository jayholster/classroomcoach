import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Chip, btn } from "@/components/AppShell";
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

function ReviewIndex() {
  const fetchSessions = useServerFn(listRehearsalSessions);
  const { data, isPending } = useQuery({ queryKey: ["sessions"], queryFn: () => fetchSessions() });

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight text-primary">After-Action Review</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Every rehearsal is reconstructed from its recorded events, not from a summary written during the session.
      </p>
      {isPending ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading rehearsals…</p>
      ) : !data?.length ? (
        <div className="panel mt-6 p-6">
          <p className="text-sm text-muted-foreground">No rehearsals recorded yet.</p>
          <Link to="/rehearse" className={`${btn} mt-4`}>
            Start a rehearsal
          </Link>
        </div>
      ) : (
        <ul className="panel mt-6 divide-y divide-border">
          {data.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <div className="text-sm font-medium text-foreground">{s.scenario_title}</div>
                <div className="text-xs text-muted-foreground">
                  Started {new Date(s.started_at).toLocaleString()}
                  {s.ended_at ? ` · Ended ${new Date(s.ended_at).toLocaleString()}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Chip tone={s.ended_at ? "default" : "accent"}>{s.ended_at ? "Complete" : "In progress"}</Chip>
                <Link to="/review/$sessionId" params={{ sessionId: s.id }} className={btn}>
                  Open review
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
