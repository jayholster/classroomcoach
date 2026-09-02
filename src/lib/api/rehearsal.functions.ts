import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  ScenarioSpecSchema,
  SimStateSchema,
  TurnOutputSchema,
  applyStateUpdate,
  renderVisibleResponse,
  type ScenarioSpec,
  type ReviewSynthesis,
  type SimState,
  type VisibleResponse,
} from "../spec/schema";

export interface SessionEvent {
  id: string;
  sequence: number;
  kind: string;
  user_action: string | null;
  visible_response: VisibleResponse | null;
  state_update: {
    relationship_changes: string[];
    participation_changes: string[];
    newly_revealed: string[];
    resolved: string[];
    new_unresolved: string[];
  } | null;
  prior_state: SimState | null;
  resulting_state: SimState | null;
  foundation_version: string;
  model_identifier: string | null;
  model_provider: string | null;
  scenario_version_id: string;
  created_at: string;
}

const EVENT_COLUMNS =
  "id, sequence, kind, user_action, visible_response, state_update, prior_state, resulting_state, foundation_version, model_identifier, model_provider, scenario_version_id, created_at";

function initialState(spec: ScenarioSpec): SimState {
  return SimStateSchema.parse({
    active_participants: spec.participants.map((p) => p.name),
    unresolved: spec.conditions.starting_moment ? [spec.conditions.starting_moment] : [],
    participation: [],
    relationship_changes: [],
    revealed: spec.information_state.visible,
    latent: spec.information_state.latent,
  });
}

export const startRehearsal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { scenarioId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: versionRow, error } = await context.supabase
      .from("scenario_versions")
      .select("id, version_label, spec, foundation_version, model_identifier, model_provider, model_config_id")
      .eq("scenario_id", data.scenarioId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const version = versionRow as unknown as {
      id: string;
      spec: unknown;
      foundation_version: string;
      model_identifier: string | null;
      model_provider: string | null;
      model_config_id: string | null;
    } | null;
    if (!version) throw new Error("This simulation has no published version yet.");
    const spec = ScenarioSpecSchema.parse(version.spec);

    const { data: scenario } = await context.supabase
      .from("scenarios")
      .select("title")
      .eq("id", data.scenarioId)
      .maybeSingle();

    const { data: sessionRow, error: sessionError } = await context.supabase
      .from("rehearsal_sessions")
      .insert({
        owner_id: context.userId,
        scenario_id: data.scenarioId,
        scenario_version_id: version.id,
        scenario_title: (scenario as { title?: string } | null)?.title ?? spec.title,
      })
      .select("id")
      .single();
    if (sessionError) throw new Error(sessionError.message);
    const sessionId = (sessionRow as { id: string }).id;

    const state = initialState(spec);
    await context.supabase
      .from("simulation_states")
      .insert({ session_id: sessionId, owner_id: context.userId, state });

    await context.supabase.from("simulation_events").insert({
      session_id: sessionId,
      owner_id: context.userId,
      sequence: 0,
      kind: "opening",
      scenario_id: data.scenarioId,
      scenario_version_id: version.id,
      foundation_version: version.foundation_version,
      model_provider: version.model_provider,
      model_identifier: version.model_identifier,
      model_config_id: version.model_config_id,
      prior_state: null,
      user_action: null,
      visible_response: spec.opening_moment,
      state_update: null,
      resulting_state: state,
    });

    return { sessionId };
  });

export const getRehearsalSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string }) => input)
  .handler(async ({ data, context }) => {
    const [{ data: session }, { data: events }, { data: state }, { data: flags }] = await Promise.all([
      context.supabase
        .from("rehearsal_sessions")
        .select("id, scenario_id, scenario_version_id, scenario_title, started_at, ended_at, review")
        .eq("id", data.sessionId)
        .maybeSingle(),
      context.supabase
        .from("simulation_events")
        .select(EVENT_COLUMNS)
        .eq("session_id", data.sessionId)
        .order("sequence"),
      context.supabase.from("simulation_states").select("state").eq("session_id", data.sessionId).maybeSingle(),
      context.supabase
        .from("flags")
        .select("id, event_id, reason, note, status, created_at")
        .eq("session_id", data.sessionId),
    ]);
    if (!session) throw new Error("Rehearsal not found.");

    const { data: version } = await context.supabase
      .from("scenario_versions")
      .select("version_label, spec, foundation_version")
      .eq("id", (session as { scenario_version_id: string }).scenario_version_id)
      .maybeSingle();

    return {
      session: session as unknown as {
        id: string;
        scenario_id: string;
        scenario_version_id: string;
        scenario_title: string;
        started_at: string;
        ended_at: string | null;
        review: ReviewSynthesis | null;
      },
      spec: ScenarioSpecSchema.parse((version as { spec?: unknown } | null)?.spec ?? {}),
      versionLabel: (version as { version_label?: string } | null)?.version_label ?? "",
      foundationVersion: (version as { foundation_version?: string } | null)?.foundation_version ?? "",
      events: (events ?? []) as unknown as SessionEvent[],
      state: SimStateSchema.parse((state as { state?: unknown } | null)?.state ?? {}),
      flags: (flags ?? []) as unknown as {
        id: string;
        event_id: string;
        reason: string;
        note: string | null;
        status: string;
        created_at: string;
      }[],
    };
  });

/** Advances the simulation by one turn and logs it as a persistent event. */
export const submitRehearsalTurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string; action: string }) => input)
  .handler(async ({ data, context }) => {
    const { loadFoundation, loadActiveModelConfig } = await import("../ai/context.server");
    const { TURN_SYSTEM, turnPrompt } = await import("../ai/prompts.server");
    const { callModelJson, ModelCallError } = await import("../ai/modelAdapter.server");

    const { data: sessionRow } = await context.supabase
      .from("rehearsal_sessions")
      .select("id, scenario_id, scenario_version_id, ended_at")
      .eq("id", data.sessionId)
      .maybeSingle();
    const session = sessionRow as unknown as {
      scenario_id: string;
      scenario_version_id: string;
      ended_at: string | null;
    } | null;
    if (!session) throw new Error("Rehearsal not found.");
    if (session.ended_at) throw new Error("This rehearsal has already ended.");

    const [{ data: versionRow }, { data: stateRow }, { data: eventRows }] = await Promise.all([
      context.supabase
        .from("scenario_versions")
        .select("spec, foundation_version, model_config_id")
        .eq("id", session.scenario_version_id)
        .maybeSingle(),
      context.supabase.from("simulation_states").select("state").eq("session_id", data.sessionId).maybeSingle(),
      context.supabase
        .from("simulation_events")
        .select("sequence, user_action, visible_response")
        .eq("session_id", data.sessionId)
        .order("sequence"),
    ]);

    const spec = ScenarioSpecSchema.parse((versionRow as { spec?: unknown } | null)?.spec ?? {});
    const state = SimStateSchema.parse((stateRow as { state?: unknown } | null)?.state ?? {});
    const priorEvents = (eventRows ?? []) as unknown as {
      sequence: number;
      user_action: string | null;
      visible_response: VisibleResponse | null;
    }[];

    const history: { role: string; text: string }[] = [];
    for (const e of priorEvents) {
      if (e.user_action) history.push({ role: "user", text: e.user_action });
      if (e.visible_response) history.push({ role: "system", text: renderVisibleResponse(e.visible_response) });
    }

    const [foundation, config] = await Promise.all([
      loadFoundation(context.supabase),
      loadActiveModelConfig(context.supabase),
    ]);

    let output;
    try {
      const { value } = await callModelJson(
        config,
        TURN_SYSTEM,
        turnPrompt({ foundation, spec, state, history, userAction: data.action }),
      );
      output = TurnOutputSchema.parse(value);
    } catch (err) {
      const message =
        err instanceof ModelCallError
          ? err.message
          : "The simulation response could not be read. Nothing was recorded — try responding again.";
      return { ok: false as const, error: message };
    }

    const nextState = applyStateUpdate(state, output.state_update);
    const sequence = (priorEvents[priorEvents.length - 1]?.sequence ?? 0) + 1;

    const { data: eventRow, error: eventError } = await context.supabase
      .from("simulation_events")
      .insert({
        session_id: data.sessionId,
        owner_id: context.userId,
        sequence,
        kind: "turn",
        scenario_id: session.scenario_id,
        scenario_version_id: session.scenario_version_id,
        foundation_version: (versionRow as { foundation_version?: string } | null)?.foundation_version ?? "",
        model_provider: config.provider_type,
        model_identifier: config.model,
        model_config_id: (versionRow as { model_config_id?: string | null } | null)?.model_config_id ?? null,
        prior_state: state,
        user_action: data.action,
        visible_response: output.visible_response,
        state_update: output.state_update,
        resulting_state: nextState,
      })
      .select(EVENT_COLUMNS)
      .single();
    if (eventError) throw new Error(eventError.message);

    await context.supabase
      .from("simulation_states")
      .update({ state: nextState, updated_at: new Date().toISOString() })
      .eq("session_id", data.sessionId);

    return { ok: true as const, event: eventRow as unknown as SessionEvent, state: nextState };
  });

export const endRehearsal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("rehearsal_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", data.sessionId)
      .is("ended_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const flagEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eventId: string; sessionId: string; reason: string; note?: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("flags").insert({
      event_id: data.eventId,
      session_id: data.sessionId,
      user_id: context.userId,
      reason: data.reason,
      note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listRehearsalSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("rehearsal_sessions")
      .select("id, scenario_id, scenario_title, started_at, ended_at")
      .order("started_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as {
      id: string;
      scenario_id: string;
      scenario_title: string;
      started_at: string;
      ended_at: string | null;
    }[];
  });

export const listPublishedScenarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("scenario_versions")
      .select("id, scenario_id, version_label, created_at, spec")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as {
      id: string;
      scenario_id: string;
      version_label: string;
      created_at: string;
      spec: { title?: string; subtitle?: string; practice_goal?: string };
    }[];
    const seen = new Set<string>();
    return rows
      .filter((r) => (seen.has(r.scenario_id) ? false : (seen.add(r.scenario_id), true)))
      .map((r) => ({
        scenarioId: r.scenario_id,
        versionId: r.id,
        versionLabel: r.version_label,
        title: r.spec?.title ?? "Untitled simulation",
        subtitle: r.spec?.subtitle ?? r.spec?.practice_goal ?? "",
      }));
  });
