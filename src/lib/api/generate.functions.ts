import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { ScenarioSpecSchema, validateScenarioSpec } from "../spec/schema";

/**
 * Calls the configured model to derive a structured scenario specification
 * from the educator's purpose, their context documents and the Classroom
 * Coach foundational resources. Never fabricates a scenario: if the model
 * output cannot be validated the failure is recorded and surfaced.
 */
export const generateStructuredScenario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { scenarioId: string }) => input)
  .handler(async ({ data, context }) => {
    const { loadFoundation, loadPeople, retrieveChunks, loadGatewayConfig } = await import("../ai/context.server");
    const { GENERATION_SYSTEM, generationPrompt } = await import("../ai/prompts.server");
    const { runModelCall } = await import("../ai/gateway.server");
    const { resolveCaller, requireAuthoring } = await import("../server/orgContext.server");
    const { writeAudit } = await import("../server/audit.server");

    const caller = await resolveCaller(context.supabase, context.userId);
    const organizationId = requireAuthoring(caller);

    const { data: scenarioRow, error } = await context.supabase
      .from("scenarios")
      .select("id, practice_purpose, practicing_role, setting_label, specifics, student_count, difficult_moment")
      .eq("id", data.scenarioId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const scenario = scenarioRow as unknown as {
      practice_purpose: string;
      practicing_role: string;
      setting_label: string;
      specifics: string;
      student_count: number;
      difficult_moment: string;
    } | null;
    if (!scenario) throw new Error("Simulation not found.");

    const [foundation, people, chunks, config] = await Promise.all([
      loadFoundation(context.supabase),
      loadPeople(context.supabase),
      retrieveChunks(
        context.supabase,
        data.scenarioId,
        `${scenario.practice_purpose} ${scenario.setting_label} ${scenario.specifics}`,
      ),
      loadGatewayConfig(context.supabase),
    ]);

    const result = await runModelCall({
      supabase: context.supabase,
      config,
      system: GENERATION_SYSTEM,
      user: generationPrompt({
         purpose: scenario.practice_purpose,
         practicingRole: scenario.practicing_role,
         setting: scenario.setting_label,
         specifics: scenario.specifics,
         studentCount: scenario.student_count,
         difficultMoment: scenario.difficult_moment,
         foundation,
        people,
        chunks,
      }),
      schema: ScenarioSpecSchema,
      functionType: "generation",
      userId: context.userId,
      organizationId,
      scenarioId: data.scenarioId,
      repairHint: "Every derived element must keep its provenance entry.",
    });

    if (!result.ok) {
      await context.supabase
        .from("scenarios")
        .update({ generation_error: result.error, status: "Needs Review" })
        .eq("id", data.scenarioId);
      return { ok: false as const, error: result.error, retryable: result.retryable };
    }

    const spec = result.value;
    await context.supabase
      .from("scenarios")
      .update({
        draft_spec: spec,
        title: spec.title || "Untitled simulation",
        subtitle: spec.subtitle,
        setting_label: spec.setting.label || scenario.setting_label,
        practicing_role: spec.practicing_role || scenario.practicing_role,
        status: "Draft",
        generation_error: null,
        model_provider: config.provider_type,
        model_identifier: config.model,
      })
      .eq("id", data.scenarioId);

    await writeAudit(context.supabase, {
      action: "scenario.revised",
      objectType: "scenario",
      objectId: data.scenarioId,
      organizationId,
      actorId: context.userId,
      actorEmail: caller.email,
      metadata: {
        model: config.model,
        provider: config.provider_type,
        configuration_version: config.configuration_version,
        documents_used: chunks.map((c) => c.source_name),
        repaired: result.repaired,
      },
    });

    return {
      ok: true as const,
      spec,
      model: config.model,
      usedDocuments: chunks.map((c) => c.source_name),
      repaired: result.repaired,
    };
  });

