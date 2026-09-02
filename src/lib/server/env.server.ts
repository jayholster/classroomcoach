/**
 * Server-side configuration layer. Every value is read lazily inside a
 * request boundary so nothing is captured at module scope, and no value is
 * ever hard-coded.
 */

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length ? value : undefined;
}

export type ServerEnvironment = "development" | "staging" | "production";

export function serverEnvironment(): ServerEnvironment {
  const raw = (read("APP_ENVIRONMENT") ?? "").toLowerCase();
  if (raw === "production" || raw === "staging" || raw === "development") return raw;
  return "development";
}

export function appRelease(): string {
  return read("APP_RELEASE") ?? read("CF_VERSION_METADATA_ID") ?? "dev";
}

export function supabaseUrl(): string | undefined {
  return read("SUPABASE_URL");
}

export function documentBucket(): string {
  return read("DOCUMENT_BUCKET") ?? "context-documents";
}

/**
 * Resolves the credential for a model configuration by *reference name* only.
 * Credentials are never stored in the database and never leave the server.
 */
export function modelCredential(reference: string | null | undefined): string | undefined {
  if (!reference) return undefined;
  if (!/^[A-Z][A-Z0-9_]*$/.test(reference)) return undefined;
  return read(reference);
}

export function lovableApiKey(): string | undefined {
  return read("LOVABLE_API_KEY");
}

/** Configuration presence checks used by the Production Readiness page. */
export function configurationReport() {
  return {
    environment: serverEnvironment(),
    release: appRelease(),
    hasSupabaseUrl: Boolean(read("SUPABASE_URL")),
    hasServiceRole: Boolean(read("SUPABASE_SERVICE_ROLE_KEY")),
    hasLovableApiKey: Boolean(read("LOVABLE_API_KEY")),
    hasExternalModelKey: Boolean(read("EXTERNAL_MODEL_API_KEY")),
    hasAppUrl: Boolean(read("APP_URL")),
    documentBucket: documentBucket(),
  };
}
