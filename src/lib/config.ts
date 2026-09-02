/**
 * Client-safe configuration layer.
 *
 * Nothing in this file may contain a secret. Every value comes from a
 * `VITE_`-prefixed environment variable so development, staging and
 * production can differ without a code change.
 */

type ViteEnv = Record<string, string | undefined>;

const env = ((import.meta as unknown as { env?: ViteEnv }).env ?? {}) as ViteEnv;

export type AppEnvironment = "development" | "staging" | "production";

function readEnvironment(): AppEnvironment {
  const raw = (env["VITE_APP_ENVIRONMENT"] ?? "").toLowerCase();
  if (raw === "production" || raw === "staging" || raw === "development") return raw;
  return env["PROD"] === "true" || env["MODE"] === "production" ? "production" : "development";
}

export const appConfig = {
  /** Which deployment this build is serving. */
  environment: readEnvironment(),
  /** Build/release identifier recorded on every session and event. */
  release: env["VITE_APP_RELEASE"] ?? "dev",
  /** Public application URL, used in invitations and documentation. */
  appUrl: env["VITE_APP_URL"] ?? (typeof window !== "undefined" ? window.location.origin : ""),
  productName: "Classroom Coach",
  /** Storage bucket that holds uploaded context documents. */
  documentBucket: env["VITE_DOCUMENT_BUCKET"] ?? "context-documents",
  supportEmail: env["VITE_SUPPORT_EMAIL"] ?? "",
} as const;

export const isProduction = appConfig.environment === "production";

/** Standing reminder shown wherever people can type or upload free text. */
export const PRIVACY_REMINDER =
  "Do not upload or type identifiable information about real students, families, or colleagues. Use pseudonyms and remove names, ID numbers, and contact details first.";
