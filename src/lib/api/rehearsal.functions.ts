import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  ScenarioSpecSchema,
  SimStateSchema,
  TurnOutputSchema,
  applyStateUpdate,
  renderVisibleResponse,
  validateTurnOutput,
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
    present_participants: spec.participants.map((p) => p.name),
    scene: { label: spec.setting.label, description: spec.setting.description },
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
    const { resolveCaller } = await import("../server/orgContext.server");
    const { appRelease } = await import("../server/env.server");
    const caller = await resolveCaller(context.supabase, context.userId);
    if (caller.status !== "active") throw new Error("This account is not active.");

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
        organization_id: caller.organizationId,
        app_release: appRelease(),
      })
      .select("id")
      .single();
    if (sessionError) throw new Error(sessionError.message);
    const sessionId = (sessionRow as { id: string }).id;

    const state = initialState(spec);
    await context.supabase
      .from("simulation_states")
      .insert({
        session_id: sessionId,
        owner_id: context.userId,
        state,
        organization_id: caller.organizationId,
      });

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
      organization_id: caller.organizationId,
      app_release: appRelease(),
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

/**
 * Advances the simulation by one turn.
 *
 * The model call happens first and is fully validated. Only once a usable
 * response exists is anything written, and that write (event + state) is
 * committed atomically by `commit_simulation_turn`, which also rejects a
 * turn that would collide with one recorded concurrently. A failed model
 * call therefore leaves the rehearsal exactly as it was.
 */
export const submitRehearsalTurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string; action: string }) => {
    const action = input.action.trim();
    if (!action) throw new Error("Write what you would say or do before submitting.");
    if (action.length > 4000) throw new Error("That response is too long. Keep it under 4000 characters.");
    return { sessionId: input.sessionId, action };
  })
  .handler(async ({ data, context }) => {
    const { loadFoundation, loadGatewayConfig } = await import("../ai/context.server");
    const { TURN_SYSTEM, turnPrompt } = await import("../ai/prompts.server");
    const { runModelCall } = await import("../ai/gateway.server");
    const { logEvent } = await import("../server/logger.server");
    const { appRelease } = await import("../server/env.server");

    const { data: sessionRow } = await context.supabase
      .from("rehearsal_sessions")
      .select("id, scenario_id, scenario_version_id, ended_at, organization_id")
      .eq("id", data.sessionId)
      .maybeSingle();
    const session = sessionRow as unknown as {
      scenario_id: string;
      scenario_version_id: string;
      ended_at: string | null;
      organization_id: string | null;
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
      loadGatewayConfig(context.supabase),
    ]);

    const result = await runModelCall({
      supabase: context.supabase,
      config,
      system: TURN_SYSTEM,
      user: turnPrompt({ foundation, spec, state, history, userAction: data.action }),
      schema: TurnOutputSchema,
      functionType: "turn",
      userId: context.userId,
      organizationId: session.organization_id,
      sessionId: data.sessionId,
      scenarioId: session.scenario_id,
      repairHint: "It must contain visible_response and state_update exactly as specified.",
    });

    if (!result.ok) {
      return { ok: false as const, error: result.error, retryable: result.retryable };
    }

    const present = new Set(state.present_participants.length ? state.present_participants : spec.participants.map((participant) => participant.name));
    let output;
    try {
      output = validateTurnOutput(result.value, present);
    } catch (validationError) {
      return { ok: false as const, error: (validationError as Error).message, retryable: false };
    }
    const stateUpdate = {
      relationship_changes: output.state_update.relationship_changes ?? [],
      participation_changes: output.state_update.participation_changes ?? [],
      newly_revealed: output.state_update.newly_revealed ?? [],
      resolved: output.state_update.resolved ?? [],
      new_unresolved: output.state_update.new_unresolved ?? [],
    };
    const nextState = applyStateUpdate(state, stateUpdate);
    const expectedSequence = (priorEvents[priorEvents.length - 1]?.sequence ?? 0) + 1;

    // The authenticated client is used for all reads and ownership checks. The
    // commit function is security-definer and intentionally callable only by
    // the server-side privileged client, so the browser cannot invoke it.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: committed, error: commitError } = await supabaseAdmin.rpc("commit_simulation_event", {
      _session_id: data.sessionId,
      _actor_id: context.userId,
      _expected_sequence: expectedSequence,
      _kind: "turn",
      _user_action: data.action,
      _visible_response: output.visible_response as never,
      _state_update: stateUpdate as never,
      _resulting_state: nextState as never,
      _foundation_version: (versionRow as { foundation_version?: string } | null)?.foundation_version ?? "",
      _model_provider: result.provider,
      _model_identifier: result.model,
      _model_config_id: ((versionRow as { model_config_id?: string | null } | null)?.model_config_id ??
        undefined) as unknown as string,
      _prior_state: state as never,
      _app_release: appRelease(),
    });

    if (commitError) {
      logEvent({
        kind: "turn.commit",
        outcome: "failure",
        errorKind: "database",
        message: commitError.message,
        sessionId: data.sessionId,
        organizationId: session.organization_id,
      });
      return { ok: false as const, error: commitError.message, retryable: true };
    }

    return {
      ok: true as const,
      event: committed as unknown as SessionEvent,
      state: nextState,
      repaired: result.repaired,
    };
  });


export const changeScene = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string; label: string; description?: string; presentParticipants: string[] }) => {
    const label = input.label.trim();
    const description = (input.description ?? "").trim();
    const presentParticipants = Array.from(new Set(input.presentParticipants.map((name) => name.trim()).filter(Boolean)));
    if (label.length < 2 || label.length > 120) throw new Error("Give the new scene a short name between 2 and 120 characters.");
    if (description.length > 500) throw new Error("Keep the scene note under 500 characters.");
    if (!presentParticipants.length) throw new Error("Keep at least one person present in the new scene.");
    return { sessionId: input.sessionId, label, description, presentParticipants };
  })
  .handler(async ({ data, context }) => {
    const { appRelease } = await import("../server/env.server");
    const { data: sessionRow } = await context.supabase
      .from("rehearsal_sessions")
      .select("id, scenario_id, scenario_version_id, ended_at, organization_id")
      .eq("id", data.sessionId)
      .maybeSingle();
    const session = sessionRow as unknown as {
      id: string;
      scenario_id: string;
      scenario_version_id: string;
      ended_at: string | null;
      organization_id: string | null;
    } | null;
    if (!session) throw new Error("Rehearsal not found.");
    if (session.ended_at) throw new Error("This rehearsal has already ended.");

    const [{ data: versionRow }, { data: stateRow }, { data: eventRows }] = await Promise.all([
      context.supabase.from("scenario_versions").select("spec, foundation_version, model_config_id").eq("id", session.scenario_version_id).maybeSingle(),
      context.supabase.from("simulation_states").select("state").eq("session_id", data.sessionId).maybeSingle(),
      context.supabase.from("simulation_events").select("sequence").eq("session_id", data.sessionId).order("sequence"),
    ]);
    const spec = ScenarioSpecSchema.parse((versionRow as { spec?: unknown } | null)?.spec ?? {});
    const state = SimStateSchema.parse((stateRow as { state?: unknown } | null)?.state ?? {});
    const cast = new Set(spec.participants.map((participant) => participant.name));
    if (data.presentParticipants.some((name) => !cast.has(name))) {
      throw new Error("Only people from the published cast can be present in a scene.");
    }
    const nextState = { ...state, scene: { label: data.label, description: data.description }, present_participants: data.presentParticipants };
    const expectedSequence = ((eventRows ?? []) as unknown as { sequence: number }[]).at(-1)?.sequence ?? -1;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: committed, error } = await supabaseAdmin.rpc("commit_simulation_event", {
      _session_id: data.sessionId,
      _actor_id: context.userId,
      _expected_sequence: expectedSequence + 1,
      _kind: "scene_change",
      _user_action: `Scene changed to ${data.label}${data.description ? ` — ${data.description}` : ""}`,
      _visible_response: null as never,
      _state_update: { scene: nextState.scene, present_participants: data.presentParticipants } as never,
      _resulting_state: nextState as never,
      _foundation_version: (versionRow as { foundation_version?: string } | null)?.foundation_version ?? "",
      _model_provider: "classroom_coach",
      _model_identifier: "scene_change",
      _model_config_id: ((versionRow as { model_config_id?: string | null } | null)?.model_config_id ?? undefined) as unknown as string,
      _prior_state: state as never,
      _app_release: appRelease(),
    });
    if (error) throw new Error(error.message);
    return { ok: true as const, event: committed as unknown as SessionEvent, state: nextState };
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
