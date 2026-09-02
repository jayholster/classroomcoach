import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Chip, Section } from "@/components/AppShell";
import { getSystemHealth, getUsageSummary, listAuditEvents } from "@/lib/api/operations.functions";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-border p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

const AUDIT_LABELS: Record<string, string> = {
  "scenario.created": "Simulation started",
  "scenario.revised": "Draft regenerated",
  "scenario.published": "Version published",
  "scenario.archived": "Simulation archived",
  "document.uploaded": "Context document added",
  "document.deleted": "Context document removed",
  "model_configuration.changed": "Model configuration changed",
  "assurance.run": "Assurance moment re-run",
};

/**
 * Administrator view of how this deployment is behaving: configuration
 * readiness, recent model reliability and cost, and the audit trail.
 */
export function OperationsPanel() {
  const health = useServerFn(getSystemHealth);
  const usage = useServerFn(getUsageSummary);
  const audit = useServerFn(listAuditEvents);

  const healthQuery = useQuery({ queryKey: ["system-health"], queryFn: () => health(), refetchInterval: 60_000 });
  const usageQuery = useQuery({ queryKey: ["usage-summary"], queryFn: () => usage({ data: { days: 14 } }) });
  const auditQuery = useQuery({ queryKey: ["audit-events"], queryFn: () => audit({ data: { limit: 25 } }) });

  const h = healthQuery.data;
  const maxCalls = Math.max(1, ...(usageQuery.data ?? []).map((d) => d.calls));

  return (
    <>
      <Section
        title="System health"
        description="What this deployment is running, and whether it is fully configured."
      >
        {healthQuery.isPending && <p className="text-sm text-muted-foreground">Checking…</p>}
        {healthQuery.isError && (
          <p className="text-sm text-destructive">
            System health is available to administrators and research users only.
          </p>
        )}
        {h && (
          <>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Environment" value={h.environment} hint={`Release ${h.release}`} />
              <Stat label="Foundation" value={h.foundationVersion} hint="Applied to new versions" />
              <Stat
                label="Active model"
                value={h.activeModel?.model ?? "None"}
                hint={h.activeModel ? `${h.activeModel.provider} · config v${h.activeModel.configurationVersion}` : ""}
              />
              <Stat
                label="Open flags"
                value={String(h.openFlags)}
                hint={`${h.documents.failed} document(s) failed to process`}
              />
            </dl>

            <ul className="mt-5 divide-y divide-border border-t border-border">
              {h.configuration.map((c) => (
                <li key={c.label} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <div className="text-sm text-foreground">{c.label}</div>
                    <div className="text-xs text-muted-foreground">{c.detail}</div>
                  </div>
                  <Chip tone={c.ready ? "accent" : "warn"}>{c.ready ? "Configured" : "Missing"}</Chip>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      {h && (
        <Section title="Model reliability — last 24 hours" description="Recorded for every AI call the system makes.">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Calls" value={String(h.last24h.calls)} />
            <Stat
              label="Failures"
              value={String(h.last24h.failures)}
              hint={h.last24h.calls ? `${Math.round((h.last24h.failures / h.last24h.calls) * 100)}% of calls` : ""}
            />
            <Stat label="Auto-repaired" value={String(h.last24h.repaired)} hint="Reformatted once, then accepted" />
            <Stat
              label="Median response"
              value={h.last24h.medianLatencyMs === null ? "—" : `${(h.last24h.medianLatencyMs / 1000).toFixed(1)}s`}
              hint={h.last24h.p95LatencyMs ? `95th percentile ${(h.last24h.p95LatencyMs / 1000).toFixed(1)}s` : ""}
            />
            <Stat
              label="Estimated cost"
              value={`$${h.last24h.estimatedCostUsd.toFixed(2)}`}
              hint="Based on configured rates"
            />
          </dl>
        </Section>
      )}

      <Section title="Usage over time" description="Daily AI calls and estimated spend across the last two weeks.">
        {usageQuery.data?.length ? (
          <table className="w-full text-sm">
            <caption className="sr-only">Daily AI usage and estimated cost</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="py-2">
                  Day
                </th>
                <th scope="col" className="py-2">
                  Calls
                </th>
                <th scope="col" className="py-2">
                  Failures
                </th>
                <th scope="col" className="py-2">
                  Tokens
                </th>
                <th scope="col" className="py-2">
                  Estimated cost
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usageQuery.data.map((d) => (
                <tr key={d.day}>
                  <th scope="row" className="py-2 text-left font-normal text-foreground">
                    {d.day}
                  </th>
                  <td className="py-2">
                    <span className="inline-flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="inline-block h-1.5 bg-primary"
                        style={{ width: `${Math.max(4, (d.calls / maxCalls) * 120)}px` }}
                      />
                      {d.calls}
                    </span>
                  </td>
                  <td className="py-2">{d.failures}</td>
                  <td className="py-2">{d.tokens.toLocaleString()}</td>
                  <td className="py-2">${d.cost.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">No AI usage recorded in this period.</p>
        )}
      </Section>

      <Section title="Audit trail" description="Who changed what. Rehearsal content is recorded separately.">
        <ul className="divide-y divide-border border-t border-border">
          {(auditQuery.data ?? []).map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm">
              <span className="text-foreground">{AUDIT_LABELS[e.action] ?? e.action}</span>
              <span className="text-xs text-muted-foreground">
                {e.actor_email ?? "Unknown user"} · {new Date(e.created_at).toLocaleString()}
              </span>
            </li>
          ))}
          {!auditQuery.data?.length && <li className="py-3 text-sm text-muted-foreground">No recorded actions yet.</li>}
        </ul>
      </Section>
    </>
  );
}
