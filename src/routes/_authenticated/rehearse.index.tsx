import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, btn, btnPrimary } from "@/components/AppShell";
import { listPublishedScenarios, startRehearsal } from "@/lib/api/rehearsal.functions";

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

function RehearseIndex() {
  const navigate = useNavigate();
  const fetchPublished = useServerFn(listPublishedScenarios);
  const start = useServerFn(startRehearsal);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data, isPending } = useQuery({ queryKey: ["published"], queryFn: () => fetchPublished() });

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
      <h1 className="text-2xl font-semibold tracking-tight text-primary">Rehearse</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Each rehearsal runs against a published version of a simulation. What you say shapes what happens next.
      </p>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      {isPending ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading published simulations…</p>
      ) : !data?.length ? (
        <div className="panel mt-6 p-6">
          <p className="text-sm text-muted-foreground">
            No published simulations yet. Publish a version from the Design Lab to rehearse it.
          </p>
          <button className={`${btn} mt-4`} onClick={() => navigate({ to: "/design" })}>
            Go to Design Lab
          </button>
        </div>
      ) : (
        <ul className="panel mt-6 divide-y divide-border">
          {data.map((s) => (
            <li key={s.scenarioId} className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <div className="text-sm font-medium text-foreground">{s.title}</div>
                <div className="text-xs text-muted-foreground">{s.subtitle}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.versionLabel}</div>
              </div>
              <button className={btnPrimary} onClick={() => void begin(s.scenarioId)} disabled={busy !== null}>
                {busy === s.scenarioId ? "Starting…" : "BEGIN REHEARSAL"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
