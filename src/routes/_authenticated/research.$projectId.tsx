import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Chip, Section, btn, btnPrimary, input } from "@/components/AppShell";
import { AssurancePanel } from "@/components/AssurancePanel";
import {
  exportDataset,
  getProjectOverview,
  listExportHistory,
  listResearchSessions,
  previewDataset,
} from "@/lib/api/research.functions";
import { EMPTY_DEFINITION, FAMILY_LABELS, type DatasetDefinition, type FieldFamily } from "@/lib/research/fields";

export const Route = createFileRoute("/_authenticated/research/$projectId")({
  head: () => ({
    meta: [
      { title: "Dataset workspace — Classroom Coach Research" },
      {
        name: "description",
        content: "Build, inspect, and export a pseudonymous dataset from an authorized Classroom Coach research scope.",
      },
      { property: "og:title", content: "Dataset workspace — Classroom Coach Research" },
      { property: "og:description", content: "Dataset builder, event explorer, and assurance evidence for one authorized scope." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectWorkspace,
});

type Tab = "overview" | "sessions" | "dataset" | "assurance";

function ProjectWorkspace() {
  const { projectId } = Route.useParams();
  const [tab, setTab] = useState<Tab>("overview");

  const overviewFn = useServerFn(getProjectOverview);
  const overview = useQuery({
    queryKey: ["research", "overview", projectId],
    queryFn: () => overviewFn({ data: { projectId } }),
  });

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/research" className="text-xs text-muted-foreground hover:text-foreground">
            ← Dataset workspaces
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-primary">
            {overview.data?.project.name ?? "Dataset workspace"}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {overview.data?.project.description || "Build and review a pseudonymous dataset within your granted scope."}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(overview.data?.scopeLabels ?? []).map((s) => (
            <Chip key={s} tone="accent">
              {s}
            </Chip>
          ))}
        </div>
      </div>

      <nav aria-label="Study sections" className="mt-6 flex gap-6 border-b border-border">
        {(
          [
            ["overview", "Overview"],
            ["sessions", "Sessions"],
            ["dataset", "Dataset Builder"],
            ["assurance", "Assurance"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            aria-current={tab === key ? "page" : undefined}
            className={`-mb-px border-b-2 pb-3 text-sm ${
              tab === key
                ? "border-primary font-medium text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-8">
        {tab === "overview" && <Overview data={overview.data} loading={overview.isLoading} projectId={projectId} />}
        {tab === "sessions" && <Sessions projectId={projectId} />}
        {tab === "dataset" && <DatasetBuilder projectId={projectId} />}
        {tab === "assurance" && <AssurancePanel />}
      </div>
    </AppShell>
  );
}

function Overview({
  data,
  loading,
  projectId,
}: {
  data: Awaited<ReturnType<typeof getProjectOverview>> | undefined;
  loading: boolean;
  projectId: string;
}) {
  const historyFn = useServerFn(listExportHistory);
  const history = useQuery({
    queryKey: ["research", "history", projectId],
    queryFn: () => historyFn({ data: { projectId } }),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Loading study…</p>;
  if (!data) return <p className="text-sm text-muted-foreground">No study data available.</p>;

  const cards: [string, number][] = [
    ["Participants", data.counts.participants],
    ["Rehearsals", data.counts.sessions],
    ["Completed", data.counts.completed],
    ["Repeat participants", data.counts.repeatParticipants],
    ["Scenarios", data.counts.scenarios],
    ["Published versions", data.counts.versions],
    ["Recorded turns", data.counts.events],
    ["Flagged moments", data.counts.flags],
  ];

  return (
    <>
      <Section title="Scope summary" description="Everything counted here is inside your grant for this study.">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(([label, value]) => (
            <div key={label} className="rounded-sm border border-border p-4">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-2xl font-semibold text-primary">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Export history" description="Every dataset export and frozen snapshot is recorded.">
        {history.data && history.data.length === 0 && (
          <p className="text-sm text-muted-foreground">No exports recorded yet.</p>
        )}
        <ul className="divide-y divide-border">
          {(history.data ?? []).map((row) => (
            <li key={row.id} className="py-3 text-sm">
              <span className="text-foreground">
                {row.action === "research.exported" ? "Dataset exported" : "Snapshot frozen"}
              </span>
              <span className="text-muted-foreground">
                {" "}
                · {new Date(row.created_at).toLocaleString()} · {row.actor_email ?? "unknown user"}
              </span>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

function Sessions({ projectId }: { projectId: string }) {
  const [completedOnly, setCompletedOnly] = useState(false);
  const listFn = useServerFn(listResearchSessions);
  const sessions = useQuery({
    queryKey: ["research", "sessions", projectId, completedOnly],
    queryFn: () => listFn({ data: { projectId, completedOnly } }),
  });

  return (
    <Section
      title="Rehearsal sessions"
      description="Participants are shown as pseudonymous study identifiers."
      actions={
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={completedOnly}
            onChange={(e) => setCompletedOnly(e.target.checked)}
            className="size-4"
          />
          Completed only
        </label>
      }
    >
      {sessions.isLoading && <p className="text-sm text-muted-foreground">Loading sessions…</p>}
      {sessions.error && (
        <p role="alert" className="text-sm text-destructive">
          {(sessions.error as Error).message}
        </p>
      )}
      {sessions.data && sessions.data.length === 0 && (
        <p className="text-sm text-muted-foreground">No rehearsals inside this scope yet.</p>
      )}
      {sessions.data && sessions.data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Rehearsal sessions in scope</caption>
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="py-2 pr-4 font-normal">
                  Participant
                </th>
                <th scope="col" className="py-2 pr-4 font-normal">
                  Scenario
                </th>
                <th scope="col" className="py-2 pr-4 font-normal">
                  Started
                </th>
                <th scope="col" className="py-2 pr-4 font-normal">
                  Turns
                </th>
                <th scope="col" className="py-2 font-normal">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sessions.data.map((s) => (
                <tr key={s.id}>
                  <td className="py-3 pr-4">
                    <Link
                      to="/research/$projectId/session/$sessionId"
                      params={{ projectId, sessionId: s.id }}
                      className="text-primary hover:underline"
                    >
                      {s.participant}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-foreground">{s.scenarioTitle}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{new Date(s.startedAt).toLocaleString()}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{s.turns}</td>
                  <td className="py-3">
                    <Chip>{s.endedAt ? "Completed" : "In progress"}</Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function DatasetBuilder({ projectId }: { projectId: string }) {
  const [definition, setDefinition] = useState<DatasetDefinition>(EMPTY_DEFINITION);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const previewFn = useServerFn(previewDataset);
  const exportFn = useServerFn(exportDataset);

  const preview = useQuery({
    queryKey: ["research", "preview", projectId, definition],
    queryFn: () => previewFn({ data: { projectId, definition } }),
  });

  const grouped = useMemo(() => {
    const map = new Map<FieldFamily, { key: string; label: string }[]>();
    for (const f of preview.data?.available ?? []) {
      const list = map.get(f.family) ?? [];
      list.push({ key: f.key, label: f.label });
      map.set(f.family, list);
    }
    return Array.from(map.entries());
  }, [preview.data?.available]);

  const toggleField = (key: string) =>
    setDefinition((d) => ({
      ...d,
      fields: d.fields.includes(key) ? d.fields.filter((f) => f !== key) : [...d.fields, key],
    }));

  const setDateFilter = (key: "from" | "to", value: string) => {
    setDefinition((d) => {
      const filters = { ...d.filters };
      if (value) filters[key] = value;
      else delete filters[key];
      return { ...d, filters };
    });
  };

  const download = (fileName: string, content: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runExport = async (format: "csv" | "json") => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await exportFn({ data: { projectId, definition, format } });
      download(result.fileName, result.content, format === "csv" ? "text/csv" : "application/json");
      download(
        result.fileName.replace(/\.(csv|json)$/, "-data-dictionary.csv"),
        ["field,label,family,collection,definition"]
          .concat(
            result.dictionary.map((d) =>
              [d.field, d.label, d.family, d.collection, d.definition]
                .map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v))
                .join(","),
            ),
          )
          .join("\n"),
        "text/csv",
      );
      setMessage(`Exported ${result.rowCount} rows with a matching data dictionary. The export was recorded.`);
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Section
        title="Fields"
        description="Choose what each exported row should contain. Optional families appear only when the study collects them."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          {grouped.map(([family, fields]) => (
            <fieldset key={family}>
              <legend className="text-xs font-semibold uppercase tracking-wide text-primary">
                {FAMILY_LABELS[family]}
              </legend>
              <div className="mt-2 space-y-1.5">
                {fields.map((f) => (
                  <label key={f.key} className="flex items-start gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4"
                      checked={definition.fields.includes(f.key)}
                      onChange={() => toggleField(f.key)}
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </Section>

      <Section title="Filters" description="Narrow the rows before previewing or exporting.">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-sm text-foreground" htmlFor="from">
              From
            </label>
            <input
              id="from"
              type="date"
              className={`${input} mt-2`}
              value={definition.filters.from ?? ""}
              onChange={(e) => setDateFilter("from", e.target.value)}

            />
          </div>
          <div>
            <label className="text-sm text-foreground" htmlFor="to">
              To
            </label>
            <input
              id="to"
              type="date"
              className={`${input} mt-2`}
              value={definition.filters.to ?? ""}
              onChange={(e) => setDateFilter("to", e.target.value)}

            />
          </div>
          <div className="flex flex-col justify-end gap-2 pb-1 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4"
                checked={Boolean(definition.filters.completedOnly)}
                onChange={(e) =>
                  setDefinition((d) => ({ ...d, filters: { ...d.filters, completedOnly: e.target.checked } }))
                }
              />
              Completed rehearsals only
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4"
                checked={Boolean(definition.filters.flaggedOnly)}
                onChange={(e) =>
                  setDefinition((d) => ({ ...d, filters: { ...d.filters, flaggedOnly: e.target.checked } }))
                }
              />
              Flagged moments only
            </label>
          </div>
        </div>
      </Section>

      <Section
        title="Preview and export"
        description="The preview shows the first rows. Exports include a data dictionary and are recorded in the audit trail."
        actions={
          <div className="flex gap-2">
            <button className={btn} disabled={busy} onClick={() => void runExport("json")}>
              Export JSON
            </button>
            <button className={btnPrimary} disabled={busy} onClick={() => void runExport("csv")}>
              {busy ? "Exporting…" : "Export CSV"}
            </button>
          </div>
        }
      >
        {message && (
          <p role="status" className="mb-3 text-sm text-muted-foreground">
            {message}
          </p>
        )}
        {preview.isLoading && <p className="text-sm text-muted-foreground">Building preview…</p>}
        {preview.error && (
          <p role="alert" className="text-sm text-destructive">
            {(preview.error as Error).message}
          </p>
        )}
        {preview.data && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">Dataset preview</caption>
              <thead className="uppercase tracking-wide text-muted-foreground">
                <tr>
                  {preview.data.fields.map((f) => (
                    <th key={f} scope="col" className="whitespace-nowrap py-2 pr-4 font-normal">
                      {f}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.data.rows.slice(0, 20).map((row, i) => (
                  <tr key={i}>
                    {preview.data.fields.map((f) => (
                      <td key={f} className="max-w-[16rem] truncate py-2 pr-4 text-foreground">
                        {typeof row[f] === "object" && row[f] !== null
                          ? JSON.stringify(row[f])
                          : String(row[f] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
