/**
 * Structured server-side logging.
 *
 * One JSON line per event so hosting log search can filter by `kind` or
 * `outcome`. Document contents, prompts, model output and personal data are
 * never logged — only identifiers, timings and error classes.
 */

import { appRelease, serverEnvironment } from "./env.server";

export type LogOutcome = "ok" | "failure" | "retry";

export interface LogFields {
  kind: string;
  outcome: LogOutcome;
  durationMs?: number | undefined;
  organizationId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  scenarioId?: string | null;
  documentId?: string | null;
  model?: string | null;
  provider?: string | null;
  attempt?: number | undefined;
  status?: number | undefined;
  errorKind?: string | undefined;
  message?: string | undefined;
  [key: string]: unknown;
}

const MAX_MESSAGE = 300;

/** Removes anything that could carry user content out of a log message. */
function safeMessage(message: unknown): string | undefined {
  if (typeof message !== "string") return undefined;
  return message.replace(/\s+/g, " ").slice(0, MAX_MESSAGE);
}

export function logEvent(fields: LogFields): void {
  const line = {
    ts: new Date().toISOString(),
    env: serverEnvironment(),
    release: appRelease(),
    ...fields,
    message: safeMessage(fields.message),
  };
  const serialized = JSON.stringify(line);
  if (fields.outcome === "failure") console.error(serialized);
  else console.log(serialized);
}

export function classifyError(error: unknown): { kind: string; status?: number; message: string } {
  if (error && typeof error === "object" && "status" in error && "message" in error) {
    const status = Number((error as { status: unknown }).status);
    return {
      kind: status === 401 ? "configuration" : status === 402 ? "credits" : status === 429 ? "rate_limit" : "provider",
      status,
      message: String((error as { message: unknown }).message),
    };
  }
  if (error instanceof Error) return { kind: "application", message: error.message };
  return { kind: "unknown", message: "Unexpected failure." };
}
