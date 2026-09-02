import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Chip, btn, btnPrimary, input } from "@/components/AppShell";
import { deleteScenario, listScenarios } from "@/lib/api/scenarios.functions";
import { createAssignment, createGroup, listAssignments, listGroups } from "@/lib/api/assignments.functions";

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

type Filter = "all" | "published" | "draft";

function friendlyDate(value?: string | null) {
  if (!value) return null;
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return null;
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(value).toLocaleDateString();
}

function LibraryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchScenarios = useServerFn(listScenarios);
  const removeScenario = useServerFn(deleteScenario);
  const fetchGroups = useServerFn(listGroups);
  const addGroup = useServerFn(createGroup);
  const fetchAssignments = useServerFn(listAssignments);
  const addAssignment = useServerFn(createAssignment);

  const { data, isPending, error } = useQuery({
    queryKey: ["scenarios"],
    queryFn: () => fetchScenarios(),
  });

  const groupsQuery = useQuery({ queryKey: ["groups"], queryFn: () => fetchGroups() });
  const assignmentsQuery = useQuery({ queryKey: ["assignments"], queryFn: () => fetchAssignments({ data: {} }) });
  const [assigning, setAssigning] = useState<NonNullable<typeof data>[number] | null>(null);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentInstructions, setAssignmentInstructions] = useState("");
  const [groupId, setGroupId] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentBusy, setAssignmentBusy] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const remove = useMutation({
    mutationFn: (id: string) => removeScenario({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenarios"] }),
  });

  const all = useMemo(() => data ?? [], [data]);
  const counts = useMemo(
    () => ({
      all: all.length,
      published: all.filter((s) => Boolean(s.version_count)).length,
      draft: all.filter((s) => !s.version_count).length,
    }),
    [all],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all
      .filter((s) => (filter === "all" ? true : filter === "published" ? Boolean(s.version_count) : !s.version_count))
      .filter((s) =>
        q
          ? `${s.title} ${s.subtitle ?? ""} ${s.practice_purpose ?? ""}`.toLowerCase().includes(q)
          : true,
      );
  }, [all, filter, search]);

  const openAssignment = (sim: NonNullable<typeof data>[number]) => {
    setAssigning(sim);
    setAssignmentTitle(`${sim.title} practice`);
    setAssignmentInstructions("");
    setGroupId("");
    setAssignmentError(null);
  };

  const createNewGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const result = await addGroup({ data: { name: newGroupName } });
      setNewGroupName("");
      await groupsQuery.refetch();
      setGroupId(result.id);
    } catch (err) {
      setAssignmentError((err as Error).message);
    }
  };

  const submitAssignment = async () => {
    if (!assigning?.latest_version_id) return;
    setAssignmentBusy(true);
    setAssignmentError(null);
    try {
      await addAssignment({
        data: {
          scenarioId: assigning.id,
          scenarioVersionId: assigning.latest_version_id,
          ...(groupId ? { groupId } : {}),
          title: assignmentTitle,
          instructions: assignmentInstructions,
        },
      });
      await assignmentsQuery.refetch();
      setAssigning(null);
    } catch (err) {
      setAssignmentError((err as Error).message);
    } finally {
      setAssignmentBusy(false);
    }
  };

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "published", label: "Ready to rehearse" },
    { key: "draft", label: "Drafts" },
  ];

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-primary">Simulation Library</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Every practice situation you have built. Drafts stay editable in the Design Lab; published versions can be
            rehearsed and assigned.
          </p>
        </div>
        <Link to="/design" className={btnPrimary}>
          Create simulation
        </Link>
      </div>

      {all.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter simulations">
            {filters.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-sm border px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {f.label} ({counts[f.key]})
                </button>
              );
            })}
          </div>
          <div className="ml-auto w-full sm:w-64">
            <label htmlFor="library-search" className="sr-only">
              Search simulations
            </label>
            <input
              id="library-search"
              className={input}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or focus"
            />
          </div>
        </div>
      )}

      {isPending && <p className="mt-6 text-sm text-muted-foreground">Loading your simulations…</p>}
      {error && (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {(error as Error).message}
        </p>
      )}

      {data && all.length === 0 && (
        <div className="panel mt-8 p-8">
          <h2 className="text-base font-medium text-foreground">No simulations yet</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Start in the Design Lab. Pick a practice focus and a difficult moment, and Classroom Coach builds the
            situation for you.
          </p>
          <Link to="/design" className={`${btnPrimary} mt-5`}>
            Go to the Design Lab
          </Link>
        </div>
      )}

      {all.length > 0 && visible.length === 0 && (
        <div className="panel mt-6 p-8 text-sm text-muted-foreground">
          Nothing matches this filter or search. Clear the search or choose “All”.
        </div>
      )}

      {visible.length > 0 && (
        <ul className="panel mt-6 divide-y divide-border">
          {visible.map((sim) => {
            const ready = Boolean(sim.version_count);
            const updated = friendlyDate((sim as { updated_at?: string }).updated_at);
            return (
              <li key={sim.id} className="flex flex-wrap items-start justify-between gap-5 p-5">
                <div className="min-w-0 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-base font-medium text-foreground">{sim.title}</h2>
                    <Chip tone={sim.status === "Needs Review" ? "warn" : ready ? "accent" : "default"}>
                      {ready ? "Ready to rehearse" : sim.status}
                    </Chip>
                  </div>
                  {(sim.subtitle || sim.practice_purpose) && (
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {sim.subtitle || sim.practice_purpose}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {ready
                      ? `${sim.latest_version_label} · ${sim.version_count} published version${sim.version_count === 1 ? "" : "s"}`
                      : "Draft — publish a version to rehearse or assign it"}
                    {updated ? ` · edited ${updated}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {ready ? (
                    <button className={btnPrimary} onClick={() => navigate({ to: "/rehearse" })}>
                      Rehearse
                    </button>
                  ) : (
                    <button
                      className={btnPrimary}
                      onClick={() => navigate({ to: "/design/$id", params: { id: sim.id } })}
                    >
                      Continue editing
                    </button>
                  )}
                  <button className={btn} onClick={() => navigate({ to: "/design/$id", params: { id: sim.id } })}>
                    {ready ? "Edit" : "Open"}
                  </button>
                  <button
                    className={btn}
                    disabled={!sim.latest_version_id}
                    title={sim.latest_version_id ? undefined : "Publish a version first"}
                    onClick={() => openAssignment(sim)}
                  >
                    Assign
                  </button>
                  <button
                    className="rounded-sm px-2 py-2 text-sm text-muted-foreground transition-colors hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Delete "${sim.title}" and everything recorded under it?`)) remove.mutate(sim.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {(assignmentsQuery.data ?? []).length > 0 && (
        <section className="panel mt-8 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-primary">Assignments</h2>
          <p className="mt-1 text-sm text-muted-foreground">Simulations you have handed to a course or group.</p>
          <ul className="mt-4 divide-y divide-border">
            {(assignmentsQuery.data ?? []).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.scenario_title ?? "Simulation"} · {a.version_label ?? "version"} ·{" "}
                    {a.group_name ?? "All eligible learners"}
                  </p>
                </div>
                <Chip tone={a.status === "open" ? "accent" : "default"}>{a.status}</Chip>
              </li>
            ))}
          </ul>
        </section>
      )}

      {assigning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/20 p-6" role="dialog" aria-modal="true" aria-labelledby="assign-title">
          <div className="w-full max-w-xl border border-border bg-card p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="assign-title" className="text-lg font-semibold text-primary">Assign simulation</h2>
                <p className="mt-1 text-sm text-muted-foreground">{assigning.title} · {assigning.latest_version_label}</p>
              </div>
              <button className={btn} onClick={() => setAssigning(null)}>Close</button>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="assignment-title" className="text-sm text-foreground">Assignment title</label>
                <input id="assignment-title" className={`${input} mt-2`} value={assignmentTitle} onChange={(e) => setAssignmentTitle(e.target.value)} />
              </div>
              <div>
                <label htmlFor="assignment-instructions" className="text-sm text-foreground">Instructions for learners</label>
                <textarea id="assignment-instructions" className={`${input} mt-2`} rows={3} value={assignmentInstructions} onChange={(e) => setAssignmentInstructions(e.target.value)} placeholder="What should learners pay attention to?" />
              </div>
              <div>
                <label htmlFor="assignment-group" className="text-sm text-foreground">Course or group</label>
                <select id="assignment-group" className={`${input} mt-2`} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                  <option value="">All eligible learners</option>
                  {(groupsQuery.data ?? []).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </select>
                <div className="mt-2 flex gap-2">
                  <input className={input} value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="New course or group" />
                  <button className={btn} onClick={() => void createNewGroup()}>Create group</button>
                </div>
              </div>
            </div>
            {assignmentError && <p role="alert" className="mt-4 text-sm text-destructive">{assignmentError}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button className={btn} onClick={() => setAssigning(null)}>Cancel</button>
              <button className={btnPrimary} disabled={assignmentBusy || !assignmentTitle.trim()} onClick={() => void submitAssignment()}>{assignmentBusy ? "Assigning…" : "Assign"}</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
