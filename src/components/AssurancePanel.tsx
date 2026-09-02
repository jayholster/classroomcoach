import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Chip, Drawer, Section, btn } from "@/components/AppShell";
import { OperationsPanel } from "@/components/OperationsPanel";
import {
  activateModelConfiguration,
  getMe,
  listFlaggedMoments,
  listModelConfigurations,
  rerunMoment,
  runAssuranceChecks,
} from "@/lib/api/admin.functions";

/**
 * Assurance lives inside the Research Terminal: it is governance evidence over
 * what has actually been published and recorded, not a separate product area.
 */
export function AssurancePanel() {
  const checks = useServerFn(runAssuranceChecks);
  const flagged = useServerFn(listFlaggedMoments);
  const models = useServerFn(listModelConfigurations);
  const me = useServerFn(getMe);
  const activate = useServerFn(activateModelConfiguration);
  const rerun = useServerFn(rerunMoment);

  const checksQuery = useQuery({ queryKey: ["assurance"], queryFn: () => checks() });
  const flagsQuery = useQuery({ queryKey: ["flagged"], queryFn: () => flagged() });
  const modelsQuery = useQuery({ queryKey: ["models"], queryFn: () => models() });
  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => me(), staleTime: 300_000 });

  const [rerunResult, setRerunResult] = useState<{ original: string; rerun: string; model: string } | null>(null);
  const [rerunError, setRerunError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const isAdmin = meQuery.data?.roles.includes("admin") ?? false;

  const doRerun = async (eventId: string) => {
    setBusy(eventId);
    setRerunError(null);
    const result = await rerun({ data: { eventId } });
    if (result.ok) setRerunResult({ original: result.original, rerun: result.rerun, model: result.model });
    else setRerunError(result.error);
    setBusy(null);
  };

  return (
    <>
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
        Mechanical checks over what has actually been published and recorded. These checks do not evaluate teaching
        quality and never produce a score.
      </p>

      <Section title="Structured checks">
        {checksQuery.isPending ? (
          <p className="text-sm text-muted-foreground">Running checks…</p>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {(checksQuery.data?.checks ?? []).map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-4 py-4">
                <div>
                  <div className="text-sm text-foreground">{c.label}</div>
                  <div className="text-xs text-muted-foreground">{c.detail}</div>
                </div>
                <Chip tone={c.status === "Pass" ? "accent" : "warn"}>{c.status}</Chip>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Published versions" description="Every version records the foundation and model it was built with.">
        <ul className="space-y-2 text-sm text-foreground">
          {(checksQuery.data?.versions ?? []).map((v) => (
            <li key={v.id}>
              {v.label}{" "}
              <span className="text-xs text-muted-foreground">
                {v.foundationVersion}
                {v.model ? ` · ${v.model}` : ""}
              </span>
            </li>
          ))}
          {!checksQuery.data?.versions.length && <li className="text-muted-foreground">No published versions yet.</li>}
        </ul>
      </Section>

      <Section title="Flagged moments" description="Raised by educators during rehearsal. Re-run a moment to test it.">
        {rerunError && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {rerunError}
          </p>
        )}
        <ul className="divide-y divide-border border-t border-border">
          {(flagsQuery.data ?? []).map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <div className="text-sm text-foreground">{f.reason}</div>
                {f.note && <div className="text-xs text-muted-foreground">{f.note}</div>}
                <div className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleString()}</div>
              </div>
              <button className={btn} onClick={() => void doRerun(f.event_id)} disabled={busy !== null}>
                {busy === f.event_id ? "Re-running…" : "Re-run this moment"}
              </button>
            </li>
          ))}
          {!flagsQuery.data?.length && <li className="py-3 text-sm text-muted-foreground">No flags raised.</li>}
        </ul>
      </Section>

      <Section title="Model configuration" description="Which model the simulation runs against.">
        <ul className="divide-y divide-border border-t border-border">
          {(modelsQuery.data ?? []).map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <div className="text-sm text-foreground">{m.name}</div>
                <div className="text-xs text-muted-foreground">
                  {m.provider_type} · {m.model}
                  {m.endpoint ? ` · ${m.endpoint}` : ""}
                </div>
              </div>
              {m.active ? (
                <Chip tone="accent">Active</Chip>
              ) : isAdmin ? (
                <button
                  className={btn}
                  onClick={async () => {
                    await activate({ data: { id: m.id } });
                    await modelsQuery.refetch();
                  }}
                >
                  Make active
                </button>
              ) : (
                <Chip>Inactive</Chip>
              )}
            </li>
          ))}
        </ul>
        {!isAdmin && (
          <p className="mt-3 text-xs text-muted-foreground">
            Only research administrators can change the active model configuration.
          </p>
        )}
      </Section>

      {isAdmin && <OperationsPanel />}

      {rerunResult && (
        <Drawer title="Re-run comparison" onClose={() => setRerunResult(null)}>
          <p className="mb-4 text-xs text-muted-foreground">Re-run with {rerunResult.model}.</p>
          <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Originally recorded</h4>
          <p className="mt-1 whitespace-pre-line text-sm text-foreground">{rerunResult.original}</p>
          <h4 className="mt-5 text-xs uppercase tracking-wide text-muted-foreground">Re-run now</h4>
          <p className="mt-1 whitespace-pre-line text-sm text-foreground">{rerunResult.rerun}</p>
          <p className="mt-5 text-xs text-muted-foreground">
            The re-run is for assurance testing only. The recorded event log is unchanged.
          </p>
        </Drawer>
      )}
    </>
  );
}
