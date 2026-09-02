import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Chip, Section } from "@/components/AppShell";
import { listResearchProjects } from "@/lib/api/research.functions";

export const Route = createFileRoute("/_authenticated/research/")({
  head: () => ({
    meta: [
      { title: "Research Terminal — Classroom Coach" },
      {
        name: "description",
        content:
          "Scoped, read-only workspace for studying rehearsal data: participants, sessions, events and exportable datasets.",
      },
      { property: "og:title", content: "Research Terminal — Classroom Coach" },
      { property: "og:description", content: "Scoped study access to rehearsal sessions and event data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResearchHome,
});

function ResearchHome() {
  const list = useServerFn(listResearchProjects);
  const query = useQuery({ queryKey: ["research", "projects"], queryFn: () => list() });

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight text-primary">Research Terminal</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Read-only access to the studies you have been granted. Participants appear as stable pseudonymous identifiers,
        never as names or email addresses.
      </p>

      <div className="mt-8">
        <Section title="Your studies" description="Access is granted per study and limited to the scope shown.">
          {query.isLoading && <p className="text-sm text-muted-foreground">Loading studies…</p>}
          {query.error && (
            <p role="alert" className="text-sm text-destructive">
              {(query.error as Error).message}
            </p>
          )}
          {query.data && query.data.length === 0 && (
            <p className="text-sm text-muted-foreground">
              You do not hold a research grant yet. An organization administrator can add you to a study.
            </p>
          )}
          <ul className="divide-y divide-border">
            {(query.data ?? []).map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0">
                  <Link
                    to="/research/$projectId"
                    params={{ projectId: p.id }}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {p.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">{p.description || "No description recorded."}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Chip>{p.status}</Chip>
                    {p.scopeLabels.map((label) => (
                      <Chip key={label} tone="accent">
                        {label}
                      </Chip>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </AppShell>
  );
}
