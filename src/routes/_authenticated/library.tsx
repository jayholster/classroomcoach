import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Chip, btn, btnPrimary } from "@/components/AppShell";
import { deleteScenario, listScenarios } from "@/lib/api/scenarios.functions";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Simulation Library — Classroom Coach" },
      {
        name: "description",
        content: "Create, adapt, and assign practice situations that are difficult to rehearse with real learners.",
      },
      { property: "og:title", content: "Simulation Library — Classroom Coach" },
      { property: "og:description", content: "Configurable professional rehearsal for educators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchScenarios = useServerFn(listScenarios);
  const removeScenario = useServerFn(deleteScenario);

  const { data, isPending, error } = useQuery({
    queryKey: ["scenarios"],
    queryFn: () => fetchScenarios(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeScenario({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenarios"] }),
  });

  return (
    <AppShell>
      <div className="mb-10 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-primary">Simulation Library</h1>
        <p className="mt-4 text-sm leading-relaxed text-foreground">
          Create, adapt, and assign practice situations that are difficult to rehearse with real learners.
        </p>
        <Link to="/design" className={`${btnPrimary} mt-6`}>
          + Create Simulation
        </Link>
      </div>

      {isPending && <p className="text-sm text-muted-foreground">Loading your simulations…</p>}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      {data && data.length === 0 && (
        <div className="panel p-8 text-sm text-muted-foreground">
          No simulations yet. Start in the Design Lab by describing what someone should practice.
        </div>
      )}

      <div className="panel divide-y divide-border">
        {(data ?? []).map((sim) => (
          <div key={sim.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-base font-medium text-foreground">{sim.title}</h2>
                <Chip tone={sim.status === "Needs Review" ? "warn" : sim.status === "Published" ? "accent" : "default"}>
                  {sim.status}
                </Chip>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{sim.subtitle || sim.practice_purpose}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {sim.version_count ? `${sim.latest_version_label} · ${sim.version_count} published` : "No published version yet"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={btn} onClick={() => navigate({ to: "/design/$id", params: { id: sim.id } })}>
                Open
              </button>
              <button
                className={btn}
                disabled={!sim.version_count}
                onClick={() => navigate({ to: "/rehearse/$id", params: { id: sim.id } })}
              >
                Rehearse
              </button>
              <button
                className={btn}
                onClick={() => {
                  if (confirm(`Delete "${sim.title}" and everything recorded under it?`)) remove.mutate(sim.id);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
