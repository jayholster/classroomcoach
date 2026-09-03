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
    const { loadGatewayConfig } = await import("../ai/context.server");
    const { REVIEW_SYSTEM, reviewPrompt } = await import("../ai/prompts.server");
    const { runModelCall } = await import("../ai/gateway.server");

    const { data: sessionRow } = await context.supabase
      .from("rehearsal_sessions")
      .select("id, scenario_version_id, review, organization_id, scenario_id")
      .eq("id", data.sessionId)
      .maybeSingle();
    const session = sessionRow as unknown as {
      scenario_version_id: string;
      scenario_id: string;
      organization_id: string | null;
      review: unknown;
    } | null;
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

    const config = await loadGatewayConfig(context.supabase);
    const result = await runModelCall({
      supabase: context.supabase,
      config,
      system: REVIEW_SYSTEM,
      user: reviewPrompt({
        spec,
        events: rows.map((r) => ({
          sequence: r.sequence,
          user_action: r.user_action,
          changes: [...(r.state_update?.relationship_changes ?? []), ...(r.state_update?.participation_changes ?? [])],
          revealed: r.state_update?.newly_revealed ?? [],
          unresolved: r.resulting_state?.unresolved ?? [],
        })),
        finalState,
        flags: (flags ?? []) as unknown as { reason: string; note: string | null }[],
      }),
      schema: ReviewSchema,
      functionType: "review",
      userId: context.userId,
      organizationId: session.organization_id,
      sessionId: data.sessionId,
      scenarioId: session.scenario_id,
      repairHint: "Every point must cite a turn number from the recorded events.",
    });

    if (!result.ok) {
      return { ok: false as const, error: result.error, retryable: result.retryable };
    }
    const review: ReviewSynthesis = result.value;

    await context.supabase
      .from("rehearsal_sessions")
      .update({ review })
      .eq("id", data.sessionId);

    return { ok: true as const, review };
  });

export type SessionFeedbackNote = {
  id: string;
  body: string;
  author_id: string;
  author_email: string | null;
  created_at: string;
};

/** Feedback an instructor left on a rehearsal. Visible to the rehearser and their instructors. */
export const listSessionFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("session_feedback")
      .select("id, body, author_id, created_at")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as unknown as { id: string; body: string; author_id: string; created_at: string }[];
    const authorIds = Array.from(new Set(list.map((row) => row.author_id)));
    const { data: profiles } = authorIds.length
      ? await context.supabase.from("profiles").select("id, email, display_name").in("id", authorIds)
      : { data: [] };
    const byId = new Map(
      ((profiles ?? []) as unknown as { id: string; email: string | null; display_name: string | null }[]).map((p) => [
        p.id,
        p.display_name || p.email,
      ]),
    );
    return {
      notes: list.map((row) => ({ ...row, author_email: byId.get(row.author_id) ?? null })) as SessionFeedbackNote[],
    };
  });

/** Adds instructor feedback. RLS allows this only for educators/admins in the session's organization. */
export const addSessionFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string; body: string }) => input)
  .handler(async ({ data, context }) => {
    const body = data.body.trim();
    if (!body) throw new Error("Write your feedback before saving it.");

    const { data: sessionRow } = await context.supabase
      .from("rehearsal_sessions")
      .select("organization_id")
      .eq("id", data.sessionId)
      .maybeSingle();
    const organizationId = (sessionRow as unknown as { organization_id: string | null } | null)?.organization_id ?? null;

    const { error } = await context.supabase.from("session_feedback").insert({
      session_id: data.sessionId,
      author_id: context.userId,
      organization_id: organizationId,
      body,
    } as never);
    if (error) throw new Error("Only an instructor in this organization can leave feedback on a rehearsal.");
    return { ok: true as const };
  });
