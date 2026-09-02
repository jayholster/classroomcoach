import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, Chip, btn, btnPrimary } from "@/components/AppShell";
import { loadSimulations, upsertSimulation } from "@/lib/store";
import { uid } from "@/lib/derive";
import type { Simulation } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Simulation Library — Classroom Coach" },
      {
        name: "description",
        content:
          "Create, adapt, and assign practice situations that are difficult to rehearse with real learners.",
      },
      { property: "og:title", content: "Simulation Library — Classroom Coach" },
      {
        property: "og:description",
        content: "Configurable professional rehearsal for educators and preservice teachers.",
      },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const [sims, setSims] = useState<Simulation[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setSims(loadSimulations());
    const h = () => setSims(loadSimulations());
    window.addEventListener("cc:store", h);
    return () => window.removeEventListener("cc:store", h);
  }, []);

  const duplicate = (sim: Simulation) => {
    const copy: Simulation = {
      ...sim,
      id: uid(),
      title: `${sim.title} (copy)`,
      status: "Draft",
      versionLabel: "Version 1",
      versions: [],
      updatedAt: new Date().toISOString(),
    };
    upsertSimulation(copy);
  };

  return (
    <AppShell>
      <div className="mb-10 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-primary">Classroom Coach</h1>
        <p className="mt-1 text-base text-muted-foreground">Configurable professional rehearsal</p>
        <p className="mt-4 text-sm leading-relaxed text-foreground">
          Create, adapt, and assign practice situations that are difficult to rehearse with real learners.
        </p>
        <Link to="/design" className={`${btnPrimary} mt-6`}>
          + Create Simulation
        </Link>
      </div>

      <div className="panel divide-y divide-border">
        {sims.map((sim) => (
          <div key={sim.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-base font-medium text-foreground">{sim.title}</h2>
                <Chip tone={sim.status === "Needs Review" ? "warn" : sim.status === "Published" ? "accent" : "default"}>
                  {sim.status}
                </Chip>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{sim.subtitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">{sim.versionLabel}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={btn} onClick={() => navigate({ to: "/design/$id", params: { id: sim.id } })}>
                Edit
              </button>
              <button className={btn} onClick={() => duplicate(sim)}>
                Duplicate
              </button>
              <button className={btn} onClick={() => navigate({ to: "/design/$id", params: { id: sim.id } })}>
                Preview
              </button>
              <button className={btn} onClick={() => navigate({ to: "/rehearse/$id", params: { id: sim.id } })}>
                Assign
              </button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
