import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, Chip, btn } from "@/components/AppShell";
import { loadSimulations } from "@/lib/store";
import type { Simulation } from "@/lib/types";

export const Route = createFileRoute("/rehearse/")({
  head: () => ({
    meta: [
      { title: "Rehearse — Classroom Coach" },
      { name: "description", content: "Launch an assigned rehearsal and practice responding in a live situation." },
      { property: "og:title", content: "Rehearse — Classroom Coach" },
      { property: "og:description", content: "Text-based professional rehearsal with simulated people." },
    ],
  }),
  component: RehearseIndex,
});

function RehearseIndex() {
  const [sims, setSims] = useState<Simulation[]>([]);
  const navigate = useNavigate();
  useEffect(() => setSims(loadSimulations()), []);

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight text-primary">Rehearse</h1>
      <p className="mt-2 text-sm text-muted-foreground">Select an assigned simulation to begin.</p>
      <div className="panel mt-6 divide-y divide-border">
        {sims.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">{s.title}</span>
                <Chip tone={s.status === "Published" ? "accent" : "default"}>{s.status}</Chip>
              </div>
              <div className="text-sm text-muted-foreground">{s.subtitle}</div>
            </div>
            <button className={btn} onClick={() => navigate({ to: "/rehearse/$id", params: { id: s.id } })}>
              Launch rehearsal
            </button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
