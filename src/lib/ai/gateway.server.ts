/**
 * The single server-side model gateway.
 *
 * Every consequential AI call in Classroom Coach goes through `runModelCall`.
 * It owns timeouts, bounded retries, concurrency limiting, structured-output
 * validation with exactly one repair attempt, usage/latency/cost recording,
 * and provider error translation. Provider credentials are read here and
 * never leave the server.
 */

import type { z } from "zod";

import type { Client } from "../server/orgContext.server";
import { classifyError, logEvent } from "../server/logger.server";
import { ModelCallError, callModelText, type ModelConfig } from "./modelAdapter.server";

export interface GatewayConfig extends ModelConfig {
  turn_model?: string | null;
  timeout_ms: number;
  max_retries: number;
  max_concurrency: number;
  input_cost_per_mtok: number | null;
  output_cost_per_mtok: number | null;
  configuration_version: number;
  credentials_reference: string | null;
}

export type FunctionType = "generation" | "turn" | "review" | "assurance" | "repair";

export interface RunModelCallInput<T> {
  supabase: Client;
  config: GatewayConfig;
  system: string;
  user: string;
  // Output type is what matters here; inputs may differ via defaults.
  schema: z.ZodType<T, never, never> | { parse: (value: unknown) => T };
  functionType: FunctionType;
  userId: string;
  organizationId: string | null;
  sessionId?: string | null;
  scenarioId?: string | null;
  /** Prompt used when the first structured response fails validation. */
  repairHint?: string;
}

export type RunModelCallResult<T> =
  | { ok: true; value: T; repaired: boolean; latencyMs: number; model: string; provider: string }
  | { ok: false; error: string; errorKind: string; retryable: boolean };

/** In-process concurrency gates, keyed by model configuration id. */
const inFlight = new Map<string, number>();

function acquire(config: GatewayConfig): boolean {
  const limit = Math.max(1, config.max_concurrency || 1);
  const current = inFlight.get(config.id) ?? 0;
  if (current >= limit) return false;
  inFlight.set(config.id, current + 1);
  return true;
}

function release(config: GatewayConfig): void {
  const current = inFlight.get(config.id) ?? 1;
  inFlight.set(config.id, Math.max(0, current - 1));
}

function estimateCost(config: GatewayConfig, inputTokens: number | null, outputTokens: number | null): number | null {
  if (config.input_cost_per_mtok === null && config.output_cost_per_mtok === null) return null;
  const inCost = ((inputTokens ?? 0) / 1_000_000) * (config.input_cost_per_mtok ?? 0);
  const outCost = ((outputTokens ?? 0) / 1_000_000) * (config.output_cost_per_mtok ?? 0);
  return Number((inCost + outCost).toFixed(6));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function recordUsage(
  input: RunModelCallInput<unknown>,
  fields: {
    attempt: number;
    latencyMs: number;
    inputTokens: number | null;
    outputTokens: number | null;
    success: boolean;
    repaired: boolean;
    errorKind?: string;
    errorMessage?: string;
  },
): Promise<void> {
  const { error } = await input.supabase.from("model_usage_events").insert({
    organization_id: input.organizationId,
    user_id: input.userId,
    session_id: input.sessionId ?? null,
    scenario_id: input.scenarioId ?? null,
    function_type: input.functionType,
    provider_type: input.config.provider_type,
    model_identifier: input.config.model,
    model_config_id: input.config.id.startsWith("00000000") ? null : input.config.id,
    configuration_version: input.config.configuration_version,
    input_tokens: fields.inputTokens,
    output_tokens: fields.outputTokens,
    latency_ms: fields.latencyMs,
    estimated_cost_usd: estimateCost(input.config, fields.inputTokens, fields.outputTokens),
    attempt: fields.attempt,
    repaired: fields.repaired,
    success: fields.success,
    error_kind: fields.errorKind ?? null,
    error_message: fields.errorMessage?.slice(0, 300) ?? null,
  });
  if (error) {
    logEvent({ kind: "usage.write", outcome: "failure", errorKind: "database", message: error.message });
  }
}

function extractJson(text: string): unknown {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new ModelCallError("The model returned a response that could not be read as structured data.", 502);
  }
}

async function callWithTimeout(
  config: GatewayConfig,
  system: string,
  user: string,
): Promise<{ text: string; inputTokens: number | null; outputTokens: number | null }> {
  return callModelText(config, system, user);
}

/**
 * Runs one validated model call. Never returns fabricated content: on any
 * failure the caller receives a structured error and the persistent state is
 * left untouched.
 */
export async function runModelCall<T>(input: RunModelCallInput<T>): Promise<RunModelCallResult<T>> {
  const config = input.functionType === "turn" && input.config.turn_model
    ? { ...input.config, model: input.config.turn_model }
    : input.config;
  const callInput = config === input.config ? input : { ...input, config };
  if (!acquire(config)) {
    return {
      ok: false,
      error: "Too many simulations are running against this model right now. Try again in a moment.",
      errorKind: "concurrency",
      retryable: true,
    };
  }

  const started = Date.now();
  const maxAttempts = Math.max(1, (config.max_retries ?? 2) + 1);
  let lastError: { kind: string; status?: number; message: string } | null = null;

  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const attemptStarted = Date.now();
      try {
        const first = await callWithTimeout(config, callInput.system, callInput.user);
        let repaired = false;
        let parsed: T;

        try {
          parsed = callInput.schema.parse(extractJson(first.text));
        } catch {
          // Exactly one controlled repair attempt.
          repaired = true;
          const repairPrompt =
            `Your previous reply could not be used. ${callInput.repairHint ?? ""}\n` +
            `Return the same content again as a single valid JSON object that exactly matches the required structure, and nothing else.\n\n` +
            `Previous reply:\n${first.text.slice(0, 6000)}`;
          const second = await callWithTimeout(config, callInput.system, repairPrompt);
          parsed = callInput.schema.parse(extractJson(second.text));
          first.outputTokens = (first.outputTokens ?? 0) + (second.outputTokens ?? 0);
          first.inputTokens = (first.inputTokens ?? 0) + (second.inputTokens ?? 0);
        }

        const latencyMs = Date.now() - attemptStarted;
        await recordUsage(callInput as RunModelCallInput<unknown>, {
          attempt,
          latencyMs,
          inputTokens: first.inputTokens,
          outputTokens: first.outputTokens,
          success: true,
          repaired,
        });
        logEvent({
          kind: `model.${callInput.functionType}`,
          outcome: "ok",
          durationMs: latencyMs,
          model: config.model,
          provider: config.provider_type,
          attempt,
          organizationId: callInput.organizationId,
          userId: callInput.userId,
          sessionId: callInput.sessionId ?? null,
          repaired,
        });
        return { ok: true, value: parsed, repaired, latencyMs, model: config.model, provider: config.provider_type };
      } catch (err) {
        lastError = classifyError(err);
        const retryable = err instanceof ModelCallError ? err.retryable : false;
        const attemptMs = Date.now() - attemptStarted;
        await recordUsage(callInput as RunModelCallInput<unknown>, {
          attempt,
          latencyMs: attemptMs,
          inputTokens: null,
          outputTokens: null,
          success: false,
          repaired: false,
          errorKind: lastError.kind,
          errorMessage: lastError.message,
        });
        logEvent({
          kind: `model.${callInput.functionType}`,
          outcome: attempt < maxAttempts && retryable ? "retry" : "failure",
          durationMs: attemptMs,
          model: config.model,
          provider: config.provider_type,
          attempt,
          status: lastError.status,
          errorKind: lastError.kind,
          message: lastError.message,
          organizationId: callInput.organizationId,
          userId: callInput.userId,
          sessionId: callInput.sessionId ?? null,
        });
        if (!retryable || attempt === maxAttempts) break;
        await sleep(Math.min(8000, 600 * 2 ** (attempt - 1)));
      }
    }
  } finally {
    release(config);
  }

  const kind = lastError?.kind ?? "unknown";
  const message =
    kind === "application"
      ? "The AI response did not match the required structure. Nothing was recorded — you can try again."
      : (lastError?.message ?? "The AI service could not be reached.");
  logEvent({
    kind: `model.${callInput.functionType}.gaveup`,
    outcome: "failure",
    durationMs: Date.now() - started,
    errorKind: kind,
    organizationId: callInput.organizationId,
  });
  return { ok: false, error: message, errorKind: kind, retryable: kind === "rate_limit" || kind === "provider" };
}
