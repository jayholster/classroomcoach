import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { ScenarioSpecSchema, SimStateSchema, TurnOutputSchema, renderVisibleResponse } from "../spec/schema";

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: roles }, { data: scopes }, { data: memberships }] = await Promise.all([
      context.supabase.from("profiles").select("id, display_name, email").eq("id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      context.supabase.from("research_scopes").select("project_id").eq("user_id", context.userId),
      context.supabase
        .from("organization_memberships")
        .select("role, is_owner")
        .eq("user_id", context.userId)
        .eq("status", "active"),
    ]);
    const orgRows = (memberships ?? []) as { role: string; is_owner: boolean }[];
    return {
      id: context.userId,
      displayName: (profile as { display_name?: string | null } | null)?.display_name ?? null,
      email: (profile as { email?: string | null } | null)?.email ?? null,
      roles: ((roles ?? []) as { role: string }[]).map((r) => r.role),
      organizationRole: orgRows[0]?.role ?? null,
      isOrgAdmin: orgRows.some((r) => r.is_owner || r.role === "admin"),
      hasResearchAccess: ((scopes ?? []) as { project_id: string }[]).length > 0,
    };
  });


export const updateDisplayName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { displayName: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ display_name: data.displayName })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listModelConfigurations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("model_configurations")
      .select("id, name, provider_type, model, endpoint, temperature, max_output, active, updated_at")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as {
      id: string;
      name: string;
      provider_type: string;
      model: string;
      endpoint: string | null;
      temperature: number | null;
      max_output: number | null;
      active: boolean;
      updated_at: string;
    }[];
  });

export const activateModelConfiguration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only an administrator can change the active model.");
    await context.supabase.from("model_configurations").update({ active: false }).neq("id", data.id);
    const { error } = await context.supabase
      .from("model_configurations")
      .update({ active: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Assurance: re-runs one recorded moment against the same version, foundation
 * and prior state, without altering the original session.
 */
export const rerunMoment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eventId: string }) => input)
  .handler(async ({ data, context }) => {
    const { loadFoundation, loadActiveModelConfig } = await import("../ai/context.server");
    const { TURN_SYSTEM, turnPrompt } = await import("../ai/prompts.server");
    const { callModelJson, ModelCallError } = await import("../ai/modelAdapter.server");

    const { data: eventRow } = await context.supabase
      .from("simulation_events")
      .select("id, session_id, scenario_version_id, user_action, prior_state, visible_response")
      .eq("id", data.eventId)
      .maybeSingle();
    const event = eventRow as unknown as {
      session_id: string;
      scenario_version_id: string;
      user_action: string | null;
      prior_state: unknown;
      visible_response: unknown;
    } | null;
    if (!event?.user_action) throw new Error("This moment has no educator action to re-run.");

    const { data: versionRow } = await context.supabase
      .from("scenario_versions")
      .select("spec")
      .eq("id", event.scenario_version_id)
      .maybeSingle();
    const spec = ScenarioSpecSchema.parse((versionRow as { spec?: unknown } | null)?.spec ?? {});
    const state = SimStateSchema.parse(event.prior_state ?? {});

    const [foundation, config] = await Promise.all([
      loadFoundation(context.supabase),
      loadActiveModelConfig(context.supabase),
    ]);

    try {
      const { value } = await callModelJson(
        config,
        TURN_SYSTEM,
        turnPrompt({ foundation, spec, state, history: [], userAction: event.user_action }),
      );
      const output = TurnOutputSchema.parse(value);
      return {
        ok: true as const,
        original: renderVisibleResponse(
          (event.visible_response as { voices: { name: string; cue: string; line: string }[]; observation: string }) ?? {
            voices: [],
            observation: "",
          },
        ),
        rerun: renderVisibleResponse(output.visible_response),
        model: config.model,
      };
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof ModelCallError ? err.message : "The moment could not be re-run.",
      };
    }
  });

export interface AssuranceCheck {
  id: string;
  label: string;
  detail: string;
  status: "Pass" | "Needs review";
}

/** Mechanical, non-scoring checks over published versions and recorded events. */
export const runAssuranceChecks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: versions }, { data: events }, { data: flags }] = await Promise.all([
      context.supabase
        .from("scenario_versions")
        .select("id, version_label, spec, foundation_version, model_identifier, created_at")
        .order("created_at", { ascending: false })
        .limit(25),
      context.supabase
        .from("simulation_events")
        .select("id, scenario_version_id, visible_response, prior_state, resulting_state, foundation_version")
        .order("created_at", { ascending: false })
        .limit(200),
      context.supabase.from("flags").select("id, reason, status, created_at").order("created_at", {
        ascending: false,
      }),
    ]);

    const versionRows = (versions ?? []) as unknown as {
      id: string;
      version_label: string;
      spec: unknown;
      foundation_version: string;
      model_identifier: string | null;
    }[];
    const eventRows = (events ?? []) as unknown as {
      id: string;
      scenario_version_id: string;
      visible_response: { voices?: { line: string }[]; observation?: string } | null;
      prior_state: { latent?: string[] } | null;
      resulting_state: { revealed?: string[]; latent?: string[] } | null;
      foundation_version: string;
    }[];

    const checks: AssuranceCheck[] = [];

    const missingProvenance = versionRows.filter((v) => {
      const parsed = ScenarioSpecSchema.safeParse(v.spec);
      if (!parsed.success) return true;
      return parsed.data.participants.some((p) => p.provenance.length === 0);
    });
    checks.push({
      id: "provenance",
      label: "Provenance recorded for every derived participant",
      detail: missingProvenance.length
        ? `${missingProvenance.length} published version(s) contain participants without a recorded source.`
        : `All ${versionRows.length} published version(s) record a source for every participant.`,
      status: missingProvenance.length ? "Needs review" : "Pass",
    });

    const latentLeaks = eventRows.filter((e) => {
      const latent = e.prior_state?.latent ?? [];
      const text = [
        ...(e.visible_response?.voices?.map((v) => v.line) ?? []),
        e.visible_response?.observation ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return latent.some((l) => l.length > 24 && text.includes(l.toLowerCase().slice(0, 24)));
    });
    checks.push({
      id: "hidden-information",
      label: "Latent information stays latent until it is revealed",
      detail: latentLeaks.length
        ? `${latentLeaks.length} recorded moment(s) appear to surface still-latent information verbatim.`
        : `No recorded moment surfaced still-latent information verbatim across ${eventRows.length} events.`,
      status: latentLeaks.length ? "Needs review" : "Pass",
    });

    const versionFoundation = new Map(versionRows.map((v) => [v.id, v.foundation_version]));
    const drift = eventRows.filter(
      (e) =>
        versionFoundation.has(e.scenario_version_id) &&
        versionFoundation.get(e.scenario_version_id) !== e.foundation_version,
    );
    checks.push({
      id: "continuity",
      label: "Events ran against the foundation version they were published with",
      detail: drift.length
        ? `${drift.length} recorded moment(s) ran under a different foundation version than their published scenario.`
        : "Every recorded moment matches the foundation version frozen into its published scenario.",
      status: drift.length ? "Needs review" : "Pass",
    });

    const openFlags = ((flags ?? []) as { status: string }[]).filter((f) => f.status !== "Resolved");
    checks.push({
      id: "flags",
      label: "Educator flags reviewed",
      detail: openFlags.length
        ? `${openFlags.length} flag(s) raised during rehearsal are still open.`
        : "No open flags.",
      status: openFlags.length ? "Needs review" : "Pass",
    });

    return {
      checks,
      versions: versionRows.map((v) => ({
        id: v.id,
        label: v.version_label,
        foundationVersion: v.foundation_version,
        model: v.model_identifier,
      })),
      flags: (flags ?? []) as unknown as {
        id: string;
        reason: string;
        status: string;
        created_at: string;
      }[],
    };
  });

export const listFlaggedMoments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("flags")
      .select("id, reason, note, status, created_at, event_id, session_id")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as {
      id: string;
      reason: string;
      note: string | null;
      status: string;
      created_at: string;
      event_id: string;
      session_id: string;
    }[];
  });
