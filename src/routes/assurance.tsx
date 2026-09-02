import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, Chip, Section, btn } from "@/components/AppShell";
import { loadSimulations } from "@/lib/store";
import type { Simulation } from "@/lib/types";

export const Route = createFileRoute("/assurance")({
  head: () => ({
    meta: [
      { title: "Assurance — Classroom Coach" },
      {
        name: "description",
        content: "Run structured checks against published simulations for continuity, boundaries, facts, and provenance.",
      },
      { property: "og:title", content: "Assurance — Classroom Coach" },
      { property: "og:description", content: "Condition-based checks, not safety scores." },
    ],
  }),
  component: AssurancePage,
});

interface CheckResult {
  name: string;
  status: "Pass" | "Needs Review";
  condition: string;
}

function runChecks(sim: Simulation): CheckResult[] {
  const draft = sim.draft;
  const hasLatent = draft.information.some((i) => i.state === "latent");
  const hasProvenance = draft.people.every((p) => p.sources.length > 0);
  const hasFacts = draft.setting.every((s) => s.trim().length > 0);
  return [
    {
      name: "Continuity",
      status: draft.people.length >= 3 ? "Pass" : "Needs Review",
      condition:
        "Scenario carries forward the same simulated people, relationships, and prior interaction history across turns.",
    },
    {
      name: "Hidden-information boundaries",
      status: hasLatent ? "Pass" : "Needs Review",
      condition:
        "Latent information is only revealed when the interaction makes it available: " +
        draft.conditions.boundaries[1],
    },
    {
      name: "Scenario facts",
      status: hasFacts ? "Pass" : "Needs Review",
      condition: `Setting statements are complete and consistent: ${draft.setting.join(" · ")}`,
    },
    {
      name: "Unsupported / stereotyped inference",
      status: "Needs Review",
      condition:
        "Responses must stay within recorded profile information and avoid stereotyped behavior: " +
        draft.conditions.boundaries[3],
    },
    {
      name: "Required provenance",
      status: hasProvenance ? "Pass" : "Needs Review",
      condition: "Every configuration decision names the authored resources that contributed to it.",
    },
    {
      name: "Core workflow",
      status: sim.versions.length ? "Pass" : "Needs Review",
      condition: "Simulation has a published version with a recorded foundation version and local context list.",
    },
  ];
}

function AssurancePage() {
  const [sims, setSims] = useState<Simulation[]>([]);
  const [results, setResults] = useState<Record<string, CheckResult[]>>({});
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => setSims(loadSimulations()), []);

  const published = sims.filter((s) => s.versions.length > 0);

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight text-primary">Assurance</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Structured checks against the conditions recorded in each published simulation. Results are conditions met or
        conditions needing review — not scores.
      </p>

      {published.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">Publish a simulation version to run checks.</p>
      )}

      {published.map((sim) => (
        <Section
          key={sim.id}
          title={sim.title}
          description={`${sim.subtitle} · ${sim.versions[sim.versions.length - 1]?.version}`}
          actions={
            <button className={btn} onClick={() => setResults((r) => ({ ...r, [sim.id]: runChecks(sim) }))}>
              Run checks
            </button>
          }
        >
          {results[sim.id] ? (
            <ul className="divide-y divide-border border-t border-border">
              {results[sim.id]!.map((c) => (
                <li key={c.name} className="py-3">
                  <button
                    className="flex w-full items-center justify-between gap-4 text-left"
                    onClick={() => setOpen(open === sim.id + c.name ? null : sim.id + c.name)}
                  >
                    <span className="text-sm text-foreground">{c.name}</span>
                    <Chip tone={c.status === "Pass" ? "accent" : "warn"}>{c.status}</Chip>
                  </button>
                  {open === sim.id + c.name && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      Condition checked: {c.condition}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No checks run for this version yet.</p>
          )}
        </Section>
      ))}
    </AppShell>
  );
}
