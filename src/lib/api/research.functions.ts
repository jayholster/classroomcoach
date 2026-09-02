import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

import type { DatasetDefinition } from "../research/fields";

export interface ResearchProjectSummary {
  id: string;
  name: string;
  description: string;
  status: string;
  organization_id: string;
  collection_settings: { optionalFamilies?: string[]; studyCondition?: string };
  scopeLabels: string[];
}

/** Studies the caller holds a grant for. Empty means no research access. */
export const listResearchProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: scopeRows } = await context.supabase
      .from("research_scopes")
      .select("project_id, scope_type")
      .eq("user_id", context.userId);
    const scopes = (scopeRows ?? []) as unknown as { project_id: string; scope_type: string }[];
    if (!scopes.length) return [] as ResearchProjectSummary[];

    const { data } = await context.supabase
      .from("research_projects")
      .select("id, name, description, status, organization_id, collection_settings")
      .in("id", Array.from(new Set(scopes.map((s) => s.project_id))))
      .order("created_at");

    const labels: Record<string, string> = {
      organization: "Organization",
      project: "Whole study organization",
      group: "Course or group",
      scenario: "Single scenario",
    };
    return ((data ?? []) as unknown as Omit<ResearchProjectSummary, "scopeLabels">[]).map((p) => ({
      ...p,
      scopeLabels: Array.from(
        new Set(scopes.filter((s) => s.project_id === p.id).map((s) => labels[s.scope_type] ?? s.scope_type)),
      ),
    }));
  });

export const getProjectOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }) => {
    const { resolveScope, listScopedSessions, ensurePseudonyms } = await import("../research/scope.server");
    const scope = await resolveScope(context.supabase, context.userId, data.projectId);
    const sessions = await listScopedSessions(context.supabase, scope, {}, 500);
    const sessionIds = sessions.map((s) => s.id);

    const [{ count: eventCount }, { count: flagCount }] = await Promise.all([
      sessionIds.length
        ? context.supabase
            .from("simulation_events")
            .select("id", { count: "exact", head: true })
            .in("session_id", sessionIds)
        : Promise.resolve({ count: 0 }),
      sessionIds.length
        ? context.supabase.from("flags").select("id", { count: "exact", head: true }).in("session_id", sessionIds)
        : Promise.resolve({ count: 0 }),
    ]);

    const participants = await ensurePseudonyms(context.supabase, scope.project.id, sessions.map((s) => s.owner_id));
    const perParticipant = new Map<string, number>();
    for (const s of sessions) perParticipant.set(s.owner_id, (perParticipant.get(s.owner_id) ?? 0) + 1);

    return {
      project: {
        id: scope.project.id,
        name: scope.project.name,
        description: scope.project.description,
        status: scope.project.status,
        collection_settings: scope.project.collection_settings,
      },
      scopeLabels: scope.scopeLabels,
      counts: {
        participants: participants.size,
        sessions: sessions.length,
        completed: sessions.filter((s) => s.ended_at).length,
        scenarios: new Set(sessions.map((s) => s.scenario_id)).size,
        versions: new Set(sessions.map((s) => s.scenario_version_id)).size,
        events: eventCount ?? 0,
        flags: flagCount ?? 0,
        repeatParticipants: Array.from(perParticipant.values()).filter((n) => n > 1).length,
      },
    };
  });

export const listResearchSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      projectId: string;
      scenarioId?: string;
      groupId?: string;
      from?: string;
      to?: string;
      completedOnly?: boolean;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { resolveScope, listScopedSessions, ensurePseudonyms } = await import("../research/scope.server");
    const { projectId, ...filters } = data;
    const scope = await resolveScope(context.supabase, context.userId, projectId);
    const sessions = await listScopedSessions(context.supabase, scope, filters, 300);
    const pseudonyms = await ensurePseudonyms(context.supabase, projectId, sessions.map((s) => s.owner_id));
    const ids = sessions.map((s) => s.id);
    const { data: events } = ids.length
      ? await context.supabase.from("simulation_events").select("session_id").in("session_id", ids)
      : { data: [] };
    const turns = new Map<string, number>();
    for (const e of (events ?? []) as unknown as { session_id: string }[]) {
      turns.set(e.session_id, (turns.get(e.session_id) ?? 0) + 1);
    }
    return sessions.map((s) => ({
      id: s.id,
      participant: pseudonyms.get(s.owner_id) ?? "P-???",
      scenarioTitle: s.scenario_title,
      scenarioId: s.scenario_id,
      versionId: s.scenario_version_id,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      assignmentId: s.assignment_id,
      turns: turns.get(s.id) ?? 0,
    }));
  });

export const getResearchSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; sessionId: string }) => input)
  .handler(async ({ data, context }) => {
    const { resolveScope, listScopedSessions, ensurePseudonyms } = await import("../research/scope.server");
    const scope = await resolveScope(context.supabase, context.userId, data.projectId);
    const sessions = await listScopedSessions(context.supabase, scope, {}, 500);
    const session = sessions.find((s) => s.id === data.sessionId);
    if (!session) throw new Error("That rehearsal is outside your grant for this study.");

    const [{ data: events }, { data: flags }, { data: annotations }, { data: version }] = await Promise.all([
      context.supabase
        .from("simulation_events")
        .select(
          "id, sequence, kind, created_at, user_action, visible_response, prior_state, state_update, resulting_state, status, foundation_version, model_provider, model_identifier, model_config_id, app_release, latency_ms",
        )
        .eq("session_id", data.sessionId)
        .order("sequence"),
      context.supabase.from("flags").select("event_id, reason, note, status").eq("session_id", data.sessionId),
      context.supabase
        .from("research_annotations")
        .select("id, event_id, body, created_at")
        .eq("project_id", data.projectId)
        .eq("session_id", data.sessionId)
        .order("created_at"),
      context.supabase
        .from("scenario_versions")
        .select("version_label, foundation_version, creator_label, created_at")
        .eq("id", session.scenario_version_id)
        .maybeSingle(),
    ]);

    const pseudonyms = await ensurePseudonyms(context.supabase, data.projectId, [session.owner_id]);
    return {
      session: {
        id: session.id,
        participant: pseudonyms.get(session.owner_id) ?? "P-???",
        scenarioTitle: session.scenario_title,
        startedAt: session.started_at,
        endedAt: session.ended_at,
        version: (version ?? null) as unknown as {
          version_label: string;
          foundation_version: string;
          creator_label: string | null;
          created_at: string;
        } | null,
      },
      events: (events ?? []).map((event) => ({
        id: String((event as { id: string }).id),
        kind: String((event as { kind?: string }).kind ?? "turn"),
        sequence: Number((event as { sequence: number }).sequence),
        created_at: String((event as { created_at: string }).created_at),
        user_action: (event as { user_action: string | null }).user_action,
        visible_response: (event as { visible_response: Json | null }).visible_response,
        prior_state: (event as { prior_state: Json | null }).prior_state,
        state_update: (event as { state_update: Json | null }).state_update,
        resulting_state: (event as { resulting_state: Json | null }).resulting_state,
        status: String((event as { status: string }).status),
        foundation_version: String((event as { foundation_version: string }).foundation_version),
        model_provider: (event as { model_provider: string | null }).model_provider,
        model_identifier: (event as { model_identifier: string | null }).model_identifier,
        model_config_id: (event as { model_config_id: string | null }).model_config_id,
        app_release: (event as { app_release: string | null }).app_release,
        latency_ms: (event as { latency_ms: number | null }).latency_ms,
      })),
      flags: (flags ?? []) as unknown as { event_id: string; reason: string; note: string | null; status: string }[],
      annotations: (annotations ?? []) as unknown as {
        id: string;
        event_id: string | null;
        body: string;
        created_at: string;
      }[],
    };
  });

export const addResearchAnnotation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; sessionId: string; eventId: string; body: string }) => input)
  .handler(async ({ data, context }) => {
    const { resolveScope } = await import("../research/scope.server");
    await resolveScope(context.supabase, context.userId, data.projectId);
    const { error } = await context.supabase.from("research_annotations").insert({
      project_id: data.projectId,
      session_id: data.sessionId,
      event_id: data.eventId,
      author_id: context.userId,
      body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const previewDataset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; definition: DatasetDefinition }) => input)
  .handler(async ({ data, context }) => {
    const { resolveScope, buildDatasetRows } = await import("../research/scope.server");
    const { dataDictionary, availableFields } = await import("../research/fields");
    const scope = await resolveScope(context.supabase, context.userId, data.projectId);
    const { fields, rows } = await buildDatasetRows(context.supabase, scope, {
      ...data.definition,
      limit: Math.min(data.definition.limit ?? 50, 50),
    });
    return {
      fields,
      rows,
      available: availableFields(scope.project.collection_settings),
      dictionary: dataDictionary(fields),
    };
  });

export const listDatasets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }) => {
    const [{ data: datasets }, { data: snapshots }] = await Promise.all([
      context.supabase
        .from("research_datasets")
        .select("id, name, description, definition, created_at, updated_at")
        .eq("project_id", data.projectId)
        .order("updated_at", { ascending: false }),
      context.supabase
        .from("research_snapshots")
        .select("id, name, row_count, created_at, version_info")
        .eq("project_id", data.projectId)
        .order("created_at", { ascending: false }),
    ]);
    return {
      datasets: (datasets ?? []) as unknown as {
        id: string;
        name: string;
        description: string;
        definition: DatasetDefinition;
        created_at: string;
        updated_at: string;
      }[],
      snapshots: (snapshots ?? []) as unknown as {
        id: string;
        name: string;
        row_count: number;
        created_at: string;
        version_info: Json;
      }[],
    };
  });

export const saveDataset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; name: string; description?: string; definition: DatasetDefinition }) => input)
  .handler(async ({ data, context }) => {
    const { resolveScope } = await import("../research/scope.server");
    await resolveScope(context.supabase, context.userId, data.projectId);
    const { data: row, error } = await context.supabase
      .from("research_datasets")
      .insert({
        project_id: data.projectId,
        created_by: context.userId,
        name: data.name,
        description: data.description ?? "",
        definition: data.definition as never,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string }).id };
  });

/** Builds the full export payload server-side and records the export in the audit log. */
export const exportDataset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; definition: DatasetDefinition; format: "csv" | "json" }) => input)
  .handler(async ({ data, context }) => {
    const { resolveScope, buildDatasetRows } = await import("../research/scope.server");
    const { dataDictionary, toCsv } = await import("../research/fields");
    const { writeAudit } = await import("../server/audit.server");
    const scope = await resolveScope(context.supabase, context.userId, data.projectId);
    const { fields, rows } = await buildDatasetRows(context.supabase, scope, data.definition);
    const dictionary = dataDictionary(fields);

    await writeAudit(context.supabase, {
      action: "research.exported",
      objectType: "research_project",
      objectId: data.projectId,
      organizationId: scope.project.organization_id,
      actorId: context.userId,
      metadata: {
        format: data.format,
        row_count: rows.length,
        fields,
        scope: scope.scopeLabels,
        filters: data.definition.filters,
      },
    });

    return {
      fileName: `${scope.project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${new Date()
        .toISOString()
        .slice(0, 10)}.${data.format}`,
      content: data.format === "csv" ? toCsv(fields, rows) : JSON.stringify({ fields, rows }, null, 2),
      dictionary,
      rowCount: rows.length,
    };
  });

export const createSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; name: string; definition: DatasetDefinition; datasetId?: string }) => input)
  .handler(async ({ data, context }) => {
    const { resolveScope, buildDatasetRows } = await import("../research/scope.server");
    const { dataDictionary } = await import("../research/fields");
    const { writeAudit } = await import("../server/audit.server");
    const { appRelease } = await import("../server/env.server");
    const scope = await resolveScope(context.supabase, context.userId, data.projectId);
    const { fields, rows } = await buildDatasetRows(context.supabase, scope, data.definition);

    const { data: row, error } = await context.supabase
      .from("research_snapshots")
      .insert({
        project_id: data.projectId,
        dataset_id: data.datasetId ?? null,
        created_by: context.userId,
        name: data.name,
        definition: data.definition as never,
        field_schema: dataDictionary(fields) as never,
        version_info: { app_release: appRelease(), frozen_at: new Date().toISOString(), scope: scope.scopeLabels } as never,
        row_count: rows.length,
        payload: rows as never,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await writeAudit(context.supabase, {
      action: "research.snapshot_created",
      objectType: "research_project",
      objectId: data.projectId,
      organizationId: scope.project.organization_id,
      actorId: context.userId,
      metadata: { snapshot: data.name, row_count: rows.length, fields },
    });
    return { id: (row as { id: string }).id, rowCount: rows.length };
  });

export const listExportHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("audit_events")
      .select("id, action, actor_email, metadata, created_at")
      .eq("object_id", data.projectId)
      .in("action", ["research.exported", "research.snapshot_created"])
      .order("created_at", { ascending: false })
      .limit(50);
    return (rows ?? []) as unknown as {
      id: string;
      action: string;
      actor_email: string | null;
      metadata: Json;
      created_at: string;
    }[];
  });

export const updateCollectionSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; optionalFamilies: string[]; studyCondition?: string }) => input)
  .handler(async ({ data, context }) => {
    const { writeAudit } = await import("../server/audit.server");
    const { resolveScope } = await import("../research/scope.server");
    const scope = await resolveScope(context.supabase, context.userId, data.projectId);
    const { error } = await context.supabase
      .from("research_projects")
      .update({
        collection_settings: {
          optionalFamilies: data.optionalFamilies,
          ...(data.studyCondition ? { studyCondition: data.studyCondition } : {}),
        } as never,
      })
      .eq("id", data.projectId);
    if (error) throw new Error("Only a study owner or organization administrator can change collection settings.");
    await writeAudit(context.supabase, {
      action: "research.settings_updated",
      objectType: "research_project",
      objectId: data.projectId,
      organizationId: scope.project.organization_id,
      actorId: context.userId,
      metadata: { optional_families: data.optionalFamilies },
    });
    return { ok: true };
  });

/**
 * Creates a study and grants the creating administrator an organization-wide
 * scope, so the Research Terminal is reachable without direct database work.
 */
export const createResearchProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; description?: string }) => input)
  .handler(async ({ data, context }) => {
    const { resolveCaller, requireAdmin } = await import("../server/orgContext.server");
    const { writeAudit } = await import("../server/audit.server");
    const caller = await resolveCaller(context.supabase, context.userId);
    requireAdmin(caller);
    if (!caller.organizationId) throw new Error("Your account is not attached to an organization yet.");

    const name = data.name.trim();
    if (!name) throw new Error("Give the study a name.");

    const { data: row, error } = await context.supabase
      .from("research_projects")
      .insert({
        organization_id: caller.organizationId,
        name,
        description: data.description?.trim() ?? "",
        status: "active",
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const projectId = (row as { id: string }).id;

    const { error: scopeError } = await context.supabase.from("research_scopes").insert({
      project_id: projectId,
      user_id: context.userId,
      scope_type: "organization",
      organization_id: caller.organizationId,
      granted_by: context.userId,
    });
    if (scopeError) throw new Error(scopeError.message);

    await writeAudit(context.supabase, {
      action: "research.settings_updated",
      objectType: "research_project",
      objectId: projectId,
      organizationId: caller.organizationId,
      actorId: context.userId,
      actorEmail: caller.email,
      metadata: { created: true, name },
    });
    return { id: projectId };
  });
