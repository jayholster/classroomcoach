import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { ScenarioSpecSchema, type ScenarioSpec } from "../spec/schema";

export interface ScenarioRow {
  id: string;
  title: string;
  subtitle: string;
  practice_purpose: string;
  practicing_role: string;
  setting_label: string;
  specifics: string;
  student_count: number;
  difficult_moment: string;
  status: string;
  draft_spec: ScenarioSpec | null;
  generation_error: string | null;
  model_identifier: string | null;
  updated_at: string;
  version_count?: number;
  latest_version_label?: string | null;
  latest_version_id?: string | null;
}

const SCENARIO_COLUMNS =
  "id, title, subtitle, practice_purpose, practicing_role, setting_label, specifics, student_count, difficult_moment, status, draft_spec, generation_error, model_identifier, updated_at";

export const listScenarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("scenarios")
      .select(SCENARIO_COLUMNS)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const scenarios = (data ?? []) as unknown as ScenarioRow[];
    const { data: versions } = await context.supabase
      .from("scenario_versions")
      .select("id, scenario_id, version_label, created_at")
      .order("created_at", { ascending: false });
    const byScenario = new Map<string, { count: number; latest: string; latestId: string }>();
    for (const v of (versions ?? []) as unknown as { scenario_id: string; version_label: string; id: string }[]) {
      const entry = byScenario.get(v.scenario_id);
      if (entry) entry.count += 1;
      else byScenario.set(v.scenario_id, { count: 1, latest: v.version_label, latestId: v.id });
    }
    return scenarios.map((s) => ({
      ...s,
      version_count: byScenario.get(s.id)?.count ?? 0,
      latest_version_label: byScenario.get(s.id)?.latest ?? null,
      latest_version_id: byScenario.get(s.id)?.latestId ?? null,
    }));
  });

export const createScenario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    purpose: string;
    practicingRole: string;
    setting: string;
    specifics: string;
    studentCount: number;
    difficultMoment: string;
  }) => {
    if (!input.purpose.trim()) throw new Error("Choose a practice focus before building a scenario.");
    if (!Number.isInteger(input.studentCount) || input.studentCount < 1 || input.studentCount > 3) {
      throw new Error("A scenario must include between one and three students.");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { resolveCaller, requireAuthoring } = await import("../server/orgContext.server");
    const { writeAudit } = await import("../server/audit.server");
    const caller = await resolveCaller(context.supabase, context.userId);
    const organizationId = requireAuthoring(caller);

    const { data: row, error } = await context.supabase
      .from("scenarios")
      .insert({
        owner_id: context.userId,
        organization_id: organizationId,
        created_by: context.userId,
        title: data.purpose.slice(0, 80) || "Untitled simulation",
        practice_purpose: data.purpose,
        practicing_role: data.practicingRole,
        setting_label: data.setting,
        specifics: data.specifics,
        student_count: data.studentCount,
        difficult_moment: data.difficultMoment,
        status: "Draft",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const id = (row as { id: string }).id;
    await writeAudit(context.supabase, {
      action: "scenario.created",
      objectType: "scenario",
      objectId: id,
      organizationId,
      actorId: context.userId,
      actorEmail: caller.email,
      metadata: { setting: data.setting },
    });
    return { id };
  });

export const getScenario = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: scenario, error } = await context.supabase
      .from("scenarios")
      .select(SCENARIO_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!scenario) throw new Error("Simulation not found.");

    const [{ data: documents }, { data: versions }] = await Promise.all([
      context.supabase
        .from("context_documents")
        .select("id, file_name, status, error_message, extracted_chars, byte_size, created_at")
        .eq("scenario_id", data.id)
        .order("created_at"),
      context.supabase
        .from("scenario_versions")
        .select("id, version_label, foundation_version, created_at, creator_label, model_identifier, model_provider")
        .eq("scenario_id", data.id)
        .order("created_at", { ascending: false }),
    ]);

    return {
      scenario: scenario as unknown as ScenarioRow,
      documents: (documents ?? []) as unknown as {
        id: string;
        file_name: string;
        status: string;
        error_message: string | null;
        extracted_chars: number;
        byte_size: number;
        created_at: string;
      }[],
      versions: (versions ?? []) as unknown as {
        id: string;
        version_label: string;
        foundation_version: string;
        created_at: string;
        creator_label: string | null;
        model_identifier: string | null;
        model_provider: string | null;
      }[],
    };
  });

export const updateScenarioInputs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      purpose?: string;
      practicingRole?: string;
      setting?: string;
      specifics?: string;
      title?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.purpose !== undefined) patch["practice_purpose"] = data.purpose;
    if (data.practicingRole !== undefined) patch["practicing_role"] = data.practicingRole;
    if (data.setting !== undefined) patch["setting_label"] = data.setting;
    if (data.specifics !== undefined) patch["specifics"] = data.specifics;
    if (data.title !== undefined) patch["title"] = data.title;
    const { error } = await context.supabase.from("scenarios").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveDraftSpec = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; spec: unknown }) => input)
  .handler(async ({ data, context }) => {
    const spec = ScenarioSpecSchema.parse(data.spec);
    const { error } = await context.supabase
      .from("scenarios")
      .update({
        draft_spec: spec,
        title: spec.title || "Untitled simulation",
        subtitle: spec.subtitle,
        setting_label: spec.setting.label,
        practicing_role: spec.practicing_role,
        student_count: spec.student_count,
        difficult_moment: spec.difficult_moment,
        status: "Draft",
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Archives a simulation. Published versions, rehearsals and event logs stay
 * intact for audit and research; the simulation simply leaves the library.
 */
export const deleteScenario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { resolveCaller, requireAuthoring } = await import("../server/orgContext.server");
    const { writeAudit } = await import("../server/audit.server");
    const caller = await resolveCaller(context.supabase, context.userId);
    const organizationId = requireAuthoring(caller);

    const { error } = await context.supabase
      .from("scenarios")
      .update({ archived_at: new Date().toISOString(), status: "Archived" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await writeAudit(context.supabase, {
      action: "scenario.archived",
      objectType: "scenario",
      objectId: data.id,
      organizationId,
      actorId: context.userId,
      actorEmail: caller.email,
    });
    return { ok: true };
  });

/** Freezes the current draft specification into an immutable published version. */
export const publishVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { resolveCaller, requireAuthoring } = await import("../server/orgContext.server");
    const { writeAudit } = await import("../server/audit.server");
    const { appRelease } = await import("../server/env.server");
    const caller = await resolveCaller(context.supabase, context.userId);
    const organizationId = requireAuthoring(caller);

    const { data: scenario, error } = await context.supabase
      .from("scenarios")
      .select("id, title, subtitle, draft_spec, model_provider, model_identifier")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const row = scenario as unknown as {
      id: string;
      title: string;
      subtitle: string;
      draft_spec: unknown;
      model_provider: string | null;
      model_identifier: string | null;
    } | null;
    if (!row?.draft_spec) throw new Error("Generate and review a scenario draft before publishing.");
    const spec = ScenarioSpecSchema.parse(row.draft_spec);

    const { loadFoundation, foundationVersion, loadActiveModelConfig } = await import("../ai/context.server");
    const foundation = await loadFoundation(context.supabase);
    const config = await loadActiveModelConfig(context.supabase);

    const [{ data: docs }, { count }] = await Promise.all([
      context.supabase.from("context_documents").select("id").eq("scenario_id", data.id).eq("status", "Ready"),
      context.supabase
        .from("scenario_versions")
        .select("id", { count: "exact", head: true })
        .eq("scenario_id", data.id),
    ]);

    const versionLabel = `Version ${(count ?? 0) + 1}`;
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", context.userId)
      .maybeSingle();
    const creator = (profile as { display_name?: string; email?: string } | null) ?? null;

    const { data: version, error: versionError } = await context.supabase
      .from("scenario_versions")
      .insert({
        scenario_id: data.id,
        owner_id: context.userId,
        version_label: versionLabel,
        spec,
        foundation_version: foundationVersion(foundation),
        context_document_ids: ((docs ?? []) as { id: string }[]).map((d) => d.id),
        created_by: context.userId,
        creator_label: creator?.display_name ?? creator?.email ?? "Educator",
        model_provider: row.model_provider ?? config.provider_type,
        model_identifier: row.model_identifier ?? config.model,
        model_config_id: config.id.startsWith("00000000") ? null : config.id,
        organization_id: organizationId,
        app_release: appRelease(),
      })
      .select("id, version_label")
      .single();
    if (versionError) throw new Error(versionError.message);

    const versionId = (version as { id: string }).id;
    if (spec.participants.length) {
      const { error: participantError } = await context.supabase.from("scenario_participants").insert(
        spec.participants.map((p) => ({
          scenario_version_id: versionId,
          owner_id: context.userId,
          participant_id: p.id,
          profile_source_id: p.profile_source_id,
          name: p.name,
          role: p.role,
          scenario_relevant_background: p.scenario_relevant_background,
          current_goal: p.current_goal,
          current_concern: p.current_concern,
          known_information: p.known_information,
          latent_information: p.latent_information,
          provenance: p.provenance,
          organization_id: organizationId,
        })),
      );
      if (participantError) throw new Error(participantError.message);
    }

    await context.supabase.from("scenarios").update({ status: "Published" }).eq("id", data.id);
    await writeAudit(context.supabase, {
      action: "scenario.published",
      objectType: "scenario",
      objectId: data.id,
      objectVersionId: versionId,
      organizationId,
      actorId: context.userId,
      actorEmail: caller.email,
      metadata: {
        version_label: versionLabel,
        foundation_version: foundationVersion(foundation),
        model_identifier: row.model_identifier ?? config.model,
      },
    });
    return { versionId, versionLabel: (version as { version_label: string }).version_label };
  });

export const listPeopleProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadPeople } = await import("../ai/context.server");
    return loadPeople(context.supabase);
  });

export const listFoundationResources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadFoundation } = await import("../ai/context.server");
    return loadFoundation(context.supabase);
  });
