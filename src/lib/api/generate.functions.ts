import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { ScenarioSpecSchema } from "../spec/schema";

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
    const { loadFoundation, loadPeople, retrieveChunks, loadActiveModelConfig } = await import("../ai/context.server");
    const { GENERATION_SYSTEM, generationPrompt } = await import("../ai/prompts.server");
    const { callModelJson, ModelCallError } = await import("../ai/modelAdapter.server");

    const { data: scenarioRow, error } = await context.supabase
      .from("scenarios")
      .select("id, practice_purpose, practicing_role, setting_label, specifics")
      .eq("id", data.scenarioId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const scenario = scenarioRow as unknown as {
      practice_purpose: string;
      practicing_role: string;
      setting_label: string;
      specifics: string;
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
      loadActiveModelConfig(context.supabase),
    ]);

    try {
      const { value } = await callModelJson(
        config,
        GENERATION_SYSTEM,
        generationPrompt({
          purpose: scenario.practice_purpose,
          practicingRole: scenario.practicing_role,
          setting: scenario.setting_label,
          specifics: scenario.specifics,
          foundation,
          people,
          chunks,
        }),
      );
      const spec = ScenarioSpecSchema.parse(value);

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

      return {
        ok: true as const,
        spec,
        model: config.model,
        usedDocuments: chunks.map((c) => c.source_name),
      };
    } catch (err) {
      const message =
        err instanceof ModelCallError
          ? err.message
          : err instanceof Error
            ? `The generated scenario did not match the required structure. ${err.message.slice(0, 200)}`
            : "Scenario generation failed.";
      await context.supabase
        .from("scenarios")
        .update({ generation_error: message, status: "Needs Review" })
        .eq("id", data.scenarioId);
      return { ok: false as const, error: message };
    }
  });
