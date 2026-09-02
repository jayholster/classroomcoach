import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { ReviewSchema, ScenarioSpecSchema, SimStateSchema, type ReviewSynthesis } from "../spec/schema";

/**
 * Builds the After-Action Review from the persisted event log only.
 * Nothing here re-plays the model conversation: the review is evidence-based.
 */
export const generateReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string }) => input)
  .handler(async ({ data, context }) => {
    const { loadActiveModelConfig } = await import("../ai/context.server");
    const { REVIEW_SYSTEM, reviewPrompt } = await import("../ai/prompts.server");
    const { callModelJson, ModelCallError } = await import("../ai/modelAdapter.server");

    const { data: sessionRow } = await context.supabase
      .from("rehearsal_sessions")
      .select("id, scenario_version_id, review")
      .eq("id", data.sessionId)
      .maybeSingle();
    const session = sessionRow as unknown as { scenario_version_id: string; review: unknown } | null;
    if (!session) throw new Error("Rehearsal not found.");

    const [{ data: versionRow }, { data: events }, { data: state }, { data: flags }] = await Promise.all([
      context.supabase.from("scenario_versions").select("spec").eq("id", session.scenario_version_id).maybeSingle(),
      context.supabase
        .from("simulation_events")
        .select("sequence, user_action, state_update, resulting_state")
        .eq("session_id", data.sessionId)
        .order("sequence"),
      context.supabase.from("simulation_states").select("state").eq("session_id", data.sessionId).maybeSingle(),
      context.supabase.from("flags").select("reason, note").eq("session_id", data.sessionId),
    ]);

    const spec = ScenarioSpecSchema.parse((versionRow as { spec?: unknown } | null)?.spec ?? {});
    const finalState = SimStateSchema.parse((state as { state?: unknown } | null)?.state ?? {});
    const rows = (events ?? []) as unknown as {
      sequence: number;
      user_action: string | null;
      state_update: {
        relationship_changes?: string[];
        participation_changes?: string[];
        newly_revealed?: string[];
        new_unresolved?: string[];
      } | null;
      resulting_state: { unresolved?: string[] } | null;
    }[];

    if (!rows.some((r) => r.user_action)) {
      return { ok: false as const, error: "This rehearsal has no recorded educator actions to review." };
    }

    const config = await loadActiveModelConfig(context.supabase);
    let review: ReviewSynthesis;
    try {
      const { value } = await callModelJson(
        config,
        REVIEW_SYSTEM,
        reviewPrompt({
          spec,
          events: rows.map((r) => ({
            sequence: r.sequence,
            user_action: r.user_action,
            changes: [
              ...(r.state_update?.relationship_changes ?? []),
              ...(r.state_update?.participation_changes ?? []),
            ],
            revealed: r.state_update?.newly_revealed ?? [],
            unresolved: r.resulting_state?.unresolved ?? [],
          })),
          finalState,
          flags: (flags ?? []) as unknown as { reason: string; note: string | null }[],
        }),
      );
      review = ReviewSchema.parse(value);
    } catch (err) {
      return {
        ok: false as const,
        error:
          err instanceof ModelCallError
            ? err.message
            : "The review could not be generated from the recorded events. Try again.",
      };
    }

    await context.supabase
      .from("rehearsal_sessions")
      .update({ review, reviewed_at: new Date().toISOString() })
      .eq("id", data.sessionId);

    return { ok: true as const, review };
  });
