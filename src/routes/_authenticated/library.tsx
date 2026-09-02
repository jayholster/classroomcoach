import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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

  const remove = useMutation({
    mutationFn: (id: string) => removeScenario({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenarios"] }),
  });

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
              <button className={btn} disabled={!sim.version_count} onClick={() => navigate({ to: "/rehearse" })}>
                Rehearse
              </button>
              <button className={btn} disabled={!sim.latest_version_id} onClick={() => openAssignment(sim)}>
                Assign
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
              <button className={btnPrimary} disabled={assignmentBusy || !assignmentTitle.trim()} onClick={() => void submitAssignment()}>{assignmentBusy ? "Assigning…" : "ASSIGN"}</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
