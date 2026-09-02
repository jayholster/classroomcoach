import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface SystemHealth {
  environment: string;
  release: string;
  foundationVersion: string;
  activeModel: { name: string; model: string; provider: string; configurationVersion: number } | null;
  configuration: {
    label: string;
    ready: boolean;
    detail: string;
  }[];
  last24h: {
    calls: number;
    failures: number;
    repaired: number;
    medianLatencyMs: number | null;
    p95LatencyMs: number | null;
    estimatedCostUsd: number;
  };
  documents: { processing: number; failed: number };
  openFlags: number;
}

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index] ?? null;
}

/**
 * Operational snapshot for administrators: what this deployment is running,
 * whether it is configured, and how the model gateway has behaved recently.
 */
export const getSystemHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SystemHealth> => {
    const { resolveCaller, requireAdmin } = await import("../server/orgContext.server");
    const { configurationReport } = await import("../server/env.server");
    const { loadFoundation, foundationVersion, loadGatewayConfig } = await import("../ai/context.server");

    const caller = await resolveCaller(context.supabase, context.userId);
    requireAdmin(caller);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [foundation, config, usage, docs, flags] = await Promise.all([
      loadFoundation(context.supabase),
      loadGatewayConfig(context.supabase),
      context.supabase
        .from("model_usage_events")
        .select("success, repaired, latency_ms, estimated_cost_usd")
        .gte("created_at", since)
        .limit(5000),
      context.supabase.from("context_documents").select("status").in("status", ["Processing", "Uploading", "Failed"]),
      context.supabase.from("flags").select("id", { count: "exact", head: true }).eq("status", "open"),
    ]);

    const rows = (usage.data ?? []) as unknown as {
      success: boolean;
      repaired: boolean;
      latency_ms: number | null;
      estimated_cost_usd: number | null;
    }[];
    const latencies = rows.map((r) => r.latency_ms ?? 0).filter((n) => n > 0);
    const report = configurationReport();
    const docRows = (docs.data ?? []) as unknown as { status: string }[];

    return {
      environment: report.environment,
      release: report.release,
      foundationVersion: foundationVersion(foundation),
      activeModel: {
        name: config.name,
        model: config.model,
        provider: config.provider_type,
        configurationVersion: config.configuration_version,
      },
      configuration: [
        { label: "Database connection", ready: report.hasSupabaseUrl, detail: "Backend URL is configured." },
        {
          label: "Model credential",
          ready: report.hasLovableApiKey || report.hasExternalModelKey,
          detail: "A credential is available for the active model provider.",
        },
        {
          label: "Document storage",
          ready: Boolean(report.documentBucket),
          detail: `Uploads are stored in the private “${report.documentBucket}” area.`,
        },
        {
          label: "Public application URL",
          ready: report.hasAppUrl,
          detail: "Used in invitations and sign-in links.",
        },
      ],
      last24h: {
        calls: rows.length,
        failures: rows.filter((r) => !r.success).length,
        repaired: rows.filter((r) => r.repaired).length,
        medianLatencyMs: percentile(latencies, 50),
        p95LatencyMs: percentile(latencies, 95),
        estimatedCostUsd: Number(rows.reduce((sum, r) => sum + Number(r.estimated_cost_usd ?? 0), 0).toFixed(4)),
      },
      documents: {
        processing: docRows.filter((d) => d.status !== "Failed").length,
        failed: docRows.filter((d) => d.status === "Failed").length,
      },
      openFlags: flags.count ?? 0,
    };
  });

export const listAuditEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number } | undefined) => ({ limit: Math.min(input?.limit ?? 50, 200) }))
  .handler(async ({ data, context }) => {
    const { resolveCaller, requireAdmin } = await import("../server/orgContext.server");
    const caller = await resolveCaller(context.supabase, context.userId);
    requireAdmin(caller);

    const { data: rows, error } = await context.supabase
      .from("audit_events")
      .select("id, action, object_type, object_id, actor_email, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as {
      id: string;
      action: string;
      object_type: string;
      object_id: string | null;
      actor_email: string | null;
      metadata: Record<string, string | number | boolean | null>;
      created_at: string;
    }[];
  });

/** Per-day usage and cost, for budget monitoring. */
export const getUsageSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number } | undefined) => ({ days: Math.min(input?.days ?? 14, 90) }))
  .handler(async ({ data, context }) => {
    const { resolveCaller, requireAdmin } = await import("../server/orgContext.server");
    const caller = await resolveCaller(context.supabase, context.userId);
    requireAdmin(caller);

    const since = new Date(Date.now() - data.days * 24 * 60 * 60 * 1000).toISOString();
    const { data: rows, error } = await context.supabase
      .from("model_usage_events")
      .select("created_at, function_type, success, estimated_cost_usd, input_tokens, output_tokens")
      .gte("created_at", since)
      .limit(20000);
    if (error) throw new Error(error.message);

    const byDay = new Map<string, { day: string; calls: number; failures: number; cost: number; tokens: number }>();
    for (const r of (rows ?? []) as unknown as {
      created_at: string;
      success: boolean;
      estimated_cost_usd: number | null;
      input_tokens: number | null;
      output_tokens: number | null;
    }[]) {
      const day = r.created_at.slice(0, 10);
      const entry = byDay.get(day) ?? { day, calls: 0, failures: 0, cost: 0, tokens: 0 };
      entry.calls += 1;
      if (!r.success) entry.failures += 1;
      entry.cost += Number(r.estimated_cost_usd ?? 0);
      entry.tokens += (r.input_tokens ?? 0) + (r.output_tokens ?? 0);
      byDay.set(day, entry);
    }
    return Array.from(byDay.values())
      .sort((a, b) => a.day.localeCompare(b.day))
      .map((d) => ({ ...d, cost: Number(d.cost.toFixed(4)) }));
  });
