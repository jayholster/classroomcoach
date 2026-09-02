import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Chip, Section, btn, btnPrimary, input } from "@/components/AppShell";

import { getMe } from "@/lib/api/admin.functions";
import { createResearchProject, listResearchProjects } from "@/lib/api/research.functions";

export const Route = createFileRoute("/_authenticated/research/")({
  head: () => ({
    meta: [
      { title: "Research Terminal — Classroom Coach" },
      {
        name: "description",
        content:
          "Build, preview, and export pseudonymous datasets from authorized Classroom Coach rehearsal sessions.",
      },
      { property: "og:title", content: "Research Terminal — Classroom Coach" },
      { property: "og:description", content: "Build and export pseudonymous research datasets from rehearsal data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResearchHome,
});

function ResearchHome() {
  const navigate = useNavigate();
  const list = useServerFn(listResearchProjects);
  const me = useServerFn(getMe);
  const createProject = useServerFn(createResearchProject);
  
  const query = useQuery({ queryKey: ["research", "projects"], queryFn: () => list() });
  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => me(), staleTime: 300_000 });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (presetName?: string) => {
    const finalName = (presetName ?? name).trim();
    if (!finalName) return;
    setBusy(true);
    setError(null);
    try {
      const { id } = await createProject({ data: { name: finalName, description } });
      await query.refetch();
      void navigate({ to: "/research/$projectId", params: { projectId: id } });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight text-primary">Research Terminal</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Build, preview and export pseudonymous datasets from rehearsal data inside your granted scope. Participants
        appear as stable pseudonymous identifiers, never as names or email addresses.
      </p>

      <div className="mt-8">
        <Section
          title="Dataset workspaces"
          description="Choose a workspace to build, preview, and export a pseudonymous dataset. Assurance evidence is available inside each workspace."
        >
          {query.isLoading && <p className="text-sm text-muted-foreground">Loading workspaces…</p>}
          {query.error && (
            <p role="alert" className="text-sm text-destructive">
              {(query.error as Error).message}
            </p>
          )}
          {query.data && query.data.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No dataset workspace yet.{" "}
              {meQuery.data?.isOrgAdmin
                ? "Open one below to start building datasets from your organization's rehearsals."
                : "An organization administrator can grant you access to one."}
            </p>
          )}
          <ul className="divide-y divide-border">
            {(query.data ?? []).map((p) => (
              <li key={p.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
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
                <Link to="/research/$projectId" params={{ projectId: p.id }} className={btn}>
                  Open dataset builder
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        {meQuery.data?.isOrgAdmin && (
          <Section
            title="New dataset workspace"
            description="Administrators can open a workspace over their own organization's rehearsals. Exported data stays pseudonymous."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm text-foreground" htmlFor="workspace-name">
                  Workspace name
                </label>
                <input
                  id="workspace-name"
                  className={`${input} mt-2`}
                  value={name}
                  placeholder="Responding to conflict — Spring cohort"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-foreground" htmlFor="workspace-description">
                  What is being examined? <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  id="workspace-description"
                  className={`${input} mt-2`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            {error && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button className={btnPrimary} disabled={busy || !name.trim()} onClick={() => void create()}>
                {busy ? "Opening workspace…" : "OPEN DATASET WORKSPACE"}
              </button>
              <button
                className={btn}
                disabled={busy}
                onClick={() => void create(`All rehearsals — ${new Date().toLocaleDateString()}`)}
              >
                Quick workspace over all rehearsals
              </button>
              <button className={btn} onClick={() => void query.refetch()} disabled={busy}>
                Refresh
              </button>
            </div>
          </Section>
        )}
      </div>
    </AppShell>
  );
}
