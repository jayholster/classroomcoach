/**
 * Server-side scope resolution and row assembly for the research terminal.
 *
 * Row Level Security is the enforcement floor: a researcher physically cannot
 * read a row outside a grant. These helpers additionally narrow every read to
 * the *one study* being viewed, so a grant on study A never leaks rows into a
 * dataset built under study B.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  availableFields,
  type CollectionSettings,
  type DatasetDefinition,
} from "./fields";

type Client = SupabaseClient<Database>;

export interface ResearchProject {
  id: string;
  name: string;
  description: string;
  status: string;
  organization_id: string;
  collection_settings: CollectionSettings;
}

export interface ResolvedScope {
  project: ResearchProject;
  organizationIds: string[];
  groupIds: string[];
  scenarioIds: string[];
  assignmentIds: string[];
  scopeLabels: string[];
}

export class ScopeError extends Error {}

export async function resolveScope(supabase: Client, userId: string, projectId: string): Promise<ResolvedScope> {
  const { data: projectRow } = await supabase
    .from("research_projects")
    .select("id, name, description, status, organization_id, collection_settings")
    .eq("id", projectId)
    .maybeSingle();
  const project = projectRow as unknown as ResearchProject | null;
  if (!project) throw new ScopeError("That study is not available to you.");

  const { data: scopeRows } = await supabase
    .from("research_scopes")
    .select("scope_type, organization_id, group_id, scenario_id")
    .eq("project_id", projectId)
    .eq("user_id", userId);
  const scopes = (scopeRows ?? []) as unknown as {
    scope_type: string;
    organization_id: string | null;
    group_id: string | null;
    scenario_id: string | null;
  }[];
  if (!scopes.length) throw new ScopeError("You do not hold a grant for this study.");

  const organizationIds = new Set<string>();
  const groupIds = new Set<string>();
  const scenarioIds = new Set<string>();
  const scopeLabels: string[] = [];

  for (const scope of scopes) {
    if (scope.scope_type === "project") {
      organizationIds.add(project.organization_id);
      scopeLabels.push("Whole study organization");
    } else if (scope.scope_type === "organization" && scope.organization_id) {
      organizationIds.add(scope.organization_id);
      scopeLabels.push("Organization");
    } else if (scope.scope_type === "group" && scope.group_id) {
      groupIds.add(scope.group_id);
      scopeLabels.push("Course or group");
    } else if (scope.scope_type === "scenario" && scope.scenario_id) {
      scenarioIds.add(scope.scenario_id);
      scopeLabels.push("Single scenario");
    }
  }

  let assignmentIds: string[] = [];
  if (groupIds.size) {
    const { data } = await supabase
      .from("assignments")
      .select("id")
      .in("group_id", Array.from(groupIds));
    assignmentIds = ((data ?? []) as { id: string }[]).map((a) => a.id);
  }

  return {
    project,
    organizationIds: Array.from(organizationIds),
    groupIds: Array.from(groupIds),
    scenarioIds: Array.from(scenarioIds),
    assignmentIds,
    scopeLabels: Array.from(new Set(scopeLabels)),
  };
}

export interface SessionFilters {
  scenarioId?: string;
  groupId?: string;
  assignmentId?: string;
  from?: string;
  to?: string;
  completedOnly?: boolean;
}

export interface ScopedSession {
  id: string;
  owner_id: string;
  scenario_id: string;
  scenario_version_id: string;
  scenario_title: string;
  started_at: string;
  ended_at: string | null;
  assignment_id: string | null;
  organization_id: string | null;
}

export async function listScopedSessions(
  supabase: Client,
  scope: ResolvedScope,
  filters: SessionFilters = {},
  limit = 500,
): Promise<ScopedSession[]> {
  const clauses: string[] = [];
  if (scope.organizationIds.length) clauses.push(`organization_id.in.(${scope.organizationIds.join(",")})`);
  if (scope.scenarioIds.length) clauses.push(`scenario_id.in.(${scope.scenarioIds.join(",")})`);
  if (scope.assignmentIds.length) clauses.push(`assignment_id.in.(${scope.assignmentIds.join(",")})`);
  if (!clauses.length) return [];

  let query = supabase
    .from("rehearsal_sessions")
    .select("id, owner_id, scenario_id, scenario_version_id, scenario_title, started_at, ended_at, assignment_id, organization_id")
    .or(clauses.join(","))
    .order("started_at", { ascending: false })
    .limit(limit);

  if (filters.scenarioId) query = query.eq("scenario_id", filters.scenarioId);
  if (filters.assignmentId) query = query.eq("assignment_id", filters.assignmentId);
  if (filters.from) query = query.gte("started_at", filters.from);
  if (filters.to) query = query.lte("started_at", filters.to);
  if (filters.completedOnly) query = query.not("ended_at", "is", null);

  const { data, error } = await query;
  if (error) throw new ScopeError(error.message);
  let rows = (data ?? []) as unknown as ScopedSession[];

  if (filters.groupId) {
    const { data: assignments } = await supabase.from("assignments").select("id").eq("group_id", filters.groupId);
    const ids = new Set(((assignments ?? []) as { id: string }[]).map((a) => a.id));
    rows = rows.filter((r) => r.assignment_id && ids.has(r.assignment_id));
  }
  return rows;
}

/**
 * Returns a stable study-specific pseudonym for each account id, minting one
 * where none exists. Account identity never leaves the server.
 */
export async function ensurePseudonyms(
  supabase: Client,
  projectId: string,
  userIds: string[],
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(userIds)).filter(Boolean);
  const map = new Map<string, string>();
  if (!unique.length) return map;

  const { data } = await supabase
    .from("research_participants")
    .select("user_id, pseudonym")
    .eq("project_id", projectId);
  const existing = (data ?? []) as unknown as { user_id: string; pseudonym: string }[];
  for (const row of existing) map.set(row.user_id, row.pseudonym);

  let next = existing.length + 1;
  const missing = unique.filter((id) => !map.has(id));
  if (missing.length) {
    const inserts = missing.map((id) => {
      const pseudonym = `P-${String(next++).padStart(3, "0")}`;
      map.set(id, pseudonym);
      return { project_id: projectId, user_id: id, pseudonym };
    });
    await supabase.from("research_participants").insert(inserts as never);
  }
  return map;
}

interface FlagRow {
  event_id: string;
  reason: string;
  note: string | null;
  status: string;
}

/** Builds one row per recorded moment, with session and scenario context joined. */
export async function buildDatasetRows(
  supabase: Client,
  scope: ResolvedScope,
  definition: DatasetDefinition,
): Promise<{ fields: string[]; rows: { [key: string]: Json | undefined }[] }> {
  const allowed = new Set(availableFields(scope.project.collection_settings).map((x) => x.key));
  const fields = (definition.fields.length ? definition.fields : []).filter((k) => allowed.has(k));
  const limit = Math.min(definition.limit ?? 2000, 5000);

  const sessions = await listScopedSessions(supabase, scope, definition.filters, 500);
  if (!sessions.length) return { fields, rows: [] };
  const sessionIds = sessions.map((s) => s.id);

  const [{ data: eventRows }, { data: flagRows }, { data: versionRows }, { data: reviewRows }, { data: usageRows }, { data: annotationRows }] =
    await Promise.all([
      supabase
        .from("simulation_events")
        .select(
          "id, session_id, sequence, created_at, user_action, visible_response, prior_state, state_update, resulting_state, status, foundation_version, model_provider, model_identifier, model_config_id, app_release, latency_ms",
        )
        .in("session_id", sessionIds)
        .order("sequence")
        .limit(limit),
      supabase.from("flags").select("event_id, reason, note, status").in("session_id", sessionIds),
      supabase
        .from("scenario_versions")
        .select("id, version_label, spec, creator_label, created_at, context_document_ids")
        .in("id", Array.from(new Set(sessions.map((s) => s.scenario_version_id)))),
      supabase.from("after_action_reviews").select("session_id, synthesis").in("session_id", sessionIds),
      supabase
        .from("model_usage_events")
        .select("session_id, input_tokens, output_tokens, estimated_cost_usd, repaired, created_at")
        .in("session_id", sessionIds),
      supabase.from("research_annotations").select("event_id").eq("project_id", scope.project.id),
    ]);

  const pseudonyms = await ensurePseudonyms(supabase, scope.project.id, sessions.map((s) => s.owner_id));

  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const flagByEvent = new Map<string, FlagRow>();
  for (const flag of (flagRows ?? []) as unknown as FlagRow[]) flagByEvent.set(flag.event_id, flag);
  const versionById = new Map(
    ((versionRows ?? []) as unknown as {
      id: string;
      version_label: string;
      spec: { participants?: unknown[] } | null;
      creator_label: string | null;
      created_at: string;
      context_document_ids: string[] | null;
    }[]).map((v) => [v.id, v]),
  );
  const reviewBySession = new Map(
    ((reviewRows ?? []) as unknown as { session_id: string; synthesis: Record<string, unknown> }[]).map((r) => [
      r.session_id,
      r.synthesis,
    ]),
  );
  const usageBySession = new Map<string, { input: number; output: number; cost: number; repaired: boolean }>();
  for (const u of (usageRows ?? []) as unknown as {
    session_id: string;
    input_tokens: number | null;
    output_tokens: number | null;
    estimated_cost_usd: number | null;
    repaired: boolean;
  }[]) {
    const acc = usageBySession.get(u.session_id) ?? { input: 0, output: 0, cost: 0, repaired: false };
    acc.input += u.input_tokens ?? 0;
    acc.output += u.output_tokens ?? 0;
    acc.cost += Number(u.estimated_cost_usd ?? 0);
    acc.repaired = acc.repaired || u.repaired;
    usageBySession.set(u.session_id, acc);
  }
  const annotationCount = new Map<string, number>();
  for (const a of (annotationRows ?? []) as unknown as { event_id: string | null }[]) {
    if (a.event_id) annotationCount.set(a.event_id, (annotationCount.get(a.event_id) ?? 0) + 1);
  }

  const events = (eventRows ?? []) as unknown as {
    id: string;
    session_id: string;
    sequence: number;
    created_at: string;
    user_action: string | null;
    visible_response: { voices?: { name: string; cue: string; line: string }[]; observation?: string } | null;
    prior_state: Json | null;
    state_update: Json | null;
    resulting_state: { revealed?: string[]; unresolved?: string[] } | null;
    status: string;
    foundation_version: string;
    model_provider: string | null;
    model_identifier: string | null;
    model_config_id: string | null;
    app_release: string | null;
    latency_ms: number | null;
  }[];

  const turnCount = new Map<string, number>();
  for (const e of events) turnCount.set(e.session_id, (turnCount.get(e.session_id) ?? 0) + 1);

  const rows = events
    .filter((e) => (definition.filters.flaggedOnly ? flagByEvent.has(e.id) : true))
    .map((e) => {
      const session = sessionById.get(e.session_id)!;
      const version = versionById.get(session.scenario_version_id) ?? null;
      const flag = flagByEvent.get(e.id) ?? null;
      const review = reviewBySession.get(e.session_id) as
        | { strengths?: string[]; growth?: string[]; next_rehearsal?: string[] }
        | undefined;
      const usage = usageBySession.get(e.session_id);
      const responseText = (e.visible_response?.voices ?? [])
        .map((v) => `${v.name}${v.cue ? ` [${v.cue}]` : ""}: ${v.line}`)
        .concat(e.visible_response?.observation ? [e.visible_response.observation] : [])
        .join(" | ");

      const full: { [key: string]: Json | undefined } = {
        session_id: session.id,
        participant_pseudonym: pseudonyms.get(session.owner_id) ?? "P-???",
        session_started_at: session.started_at,
        session_ended_at: session.ended_at,
        session_completed: Boolean(session.ended_at),
        assignment_id: session.assignment_id,
        group_id: null,
        turn_count: turnCount.get(session.id) ?? 0,
        scenario_id: session.scenario_id,
        scenario_title: session.scenario_title,
        scenario_version_id: session.scenario_version_id,
        scenario_version_label: version?.version_label ?? null,
        participant_count: (version?.spec?.participants ?? []).length,
        event_id: e.id,
        sequence: e.sequence,
        event_created_at: e.created_at,
        user_action: e.user_action,
        visible_response: responseText,
        event_status: e.status,
        prior_state: e.prior_state,
        state_update: e.state_update,
        resulting_state: e.resulting_state,
        revealed_count: (e.resulting_state?.revealed ?? []).length,
        unresolved_count: (e.resulting_state?.unresolved ?? []).length,
        foundation_version: e.foundation_version,
        model_provider: e.model_provider,
        model_identifier: e.model_identifier,
        model_config_id: e.model_config_id,
        app_release: e.app_release,
        flagged: Boolean(flag),
        flag_reason: flag?.reason ?? null,
        flag_note: flag?.note ?? null,
        flag_status: flag?.status ?? null,
        annotation_count: annotationCount.get(e.id) ?? 0,
        review_present: Boolean(review),
        review_strengths: review?.strengths?.join(" • ") ?? null,
        review_growth: review?.growth?.join(" • ") ?? null,
        review_next: review?.next_rehearsal?.join(" • ") ?? null,
        authored_by: version?.creator_label ?? null,
        version_created_at: version?.created_at ?? null,
        context_document_count: (version?.context_document_ids ?? []).length,
        latency_ms: e.latency_ms,
        input_tokens: usage?.input ?? null,
        output_tokens: usage?.output ?? null,
        estimated_cost_usd: usage ? Number(usage.cost.toFixed(4)) : null,
        repaired: usage?.repaired ?? null,
        assurance_run_count: null,
        study_condition: scope.project.collection_settings?.studyCondition ?? null,
      };

      const row: { [key: string]: Json | undefined } = {};
      for (const key of fields) row[key] = full[key] as Json | null;
      return row;
    });

  return { fields, rows };
}
