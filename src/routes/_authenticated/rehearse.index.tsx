import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Chip, btn, btnPrimary, input } from "@/components/AppShell";
import { listPublishedScenarios, listRehearsalSessions, startRehearsal } from "@/lib/api/rehearsal.functions";

export const Route = createFileRoute("/_authenticated/rehearse/")({
  head: () => ({
    meta: [
      { title: "Rehearse — Classroom Coach" },
      { name: "description", content: "Choose a published simulation and practise responding in the moment." },
      { property: "og:title", content: "Rehearse — Classroom Coach" },
      { property: "og:description", content: "Practise a difficult teaching situation with real consequences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RehearseIndex,
});

function friendlyDate(value: string) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.floor((Date.now() - then) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(value).toLocaleDateString();
}

function RehearseIndex() {
  const navigate = useNavigate();
  const fetchPublished = useServerFn(listPublishedScenarios);
  const fetchSessions = useServerFn(listRehearsalSessions);
  const start = useServerFn(startRehearsal);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { data, isPending } = useQuery({ queryKey: ["published"], queryFn: () => fetchPublished() });
  const sessionsQuery = useQuery({ queryKey: ["sessions"], queryFn: () => fetchSessions() });

  const inProgress = useMemo(
    () => (sessionsQuery.data ?? []).filter((s) => !s.ended_at).slice(0, 3),
    [sessionsQuery.data],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((s) => (q ? `${s.title} ${s.subtitle}`.toLowerCase().includes(q) : true));
  }, [data, search]);

  const begin = async (scenarioId: string) => {
    setBusy(scenarioId);
    setError(null);
    try {
      const { sessionId } = await start({ data: { scenarioId } });
      navigate({ to: "/rehearse/$id", params: { id: sessionId } });
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  };

  return (
    <AppShell>
      <h1 className="text-3xl font-semibold tracking-tight text-primary">Rehearse</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Each rehearsal runs against a published version of a simulation. What you say shapes what happens next, and
        everything you do is saved for the after-action review.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {inProgress.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-primary">Continue where you left off</h2>
          <ul className="panel mt-3 divide-y divide-border">
            {inProgress.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-sm font-medium text-foreground">{s.scenario_title}</p>
                  <p className="text-xs text-muted-foreground">Started {friendlyDate(s.started_at)} · still open</p>
                </div>
                <button
                  className={btnPrimary}
                  onClick={() => navigate({ to: "/rehearse/$id", params: { id: s.id } })}
                >
                  Resume
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-primary">Start a new rehearsal</h2>
          {(data ?? []).length > 3 && (
            <div className="w-full sm:w-64">
              <label htmlFor="rehearse-search" className="sr-only">
                Search published simulations
              </label>
              <input
                id="rehearse-search"
                className={input}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search simulations"
              />
            </div>
          )}
        </div>

        {isPending ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading published simulations…</p>
        ) : !data?.length ? (
          <div className="panel mt-3 p-6">
            <p className="text-sm text-foreground">No published simulations yet</p>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              A simulation becomes rehearsable once you publish a version of it in the Design Lab.
            </p>
            <button className={`${btn} mt-4`} onClick={() => navigate({ to: "/design" })}>
              Go to Design Lab
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="panel mt-3 p-6 text-sm text-muted-foreground">No simulations match that search.</div>
        ) : (
          <ul className="panel mt-3 divide-y divide-border">
            {visible.map((s) => (
              <li key={s.scenarioId} className="flex flex-wrap items-start justify-between gap-4 p-5">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-foreground">{s.title}</span>
                    <Chip tone="accent">{s.versionLabel}</Chip>
                  </div>
                  {s.subtitle && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.subtitle}</p>}
                </div>
                <button className={btnPrimary} onClick={() => void begin(s.scenarioId)} disabled={busy !== null}>
                  {busy === s.scenarioId ? "Starting…" : "Begin rehearsal"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
