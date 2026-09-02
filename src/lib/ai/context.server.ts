import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

import { FALLBACK_MODEL_CONFIG, type ModelConfig } from "./modelAdapter.server";

export type Client = SupabaseClient<Database>;

export interface FoundationResource {
  key: string;
  name: string;
  governs: string;
  body: string;
  version: string;
}

export interface PersonRow {
  key: string;
  name: string;
  participant_type: string;
  grade_label: string;
  descriptor: string;
  background: string;
  ses: string;
  tendencies: string[];
  close_with: string[];
  tension_with: string[];
  interests: string[];
  knows: string[];
  hidden_from_teacher: string[];
}

export async function loadFoundation(supabase: Client): Promise<FoundationResource[]> {
  const { data, error } = await supabase
    .from("foundation_resources")
    .select("key, name, governs, body, version, sort_order")
    .eq("active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FoundationResource[];
}

export function foundationVersion(resources: FoundationResource[]): string {
  return resources[0]?.version ?? "Foundation 2026.1";
}

export function foundationText(resources: FoundationResource[]): string {
  return resources.map((r) => `## ${r.name}\n${r.body}`).join("\n\n");
}

export async function loadPeople(supabase: Client): Promise<PersonRow[]> {
  const { data, error } = await supabase
    .from("people_profiles")
    .select(
      "key, name, participant_type, grade_label, descriptor, background, ses, tendencies, close_with, tension_with, interests, knows, hidden_from_teacher",
    )
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PersonRow[];
}

export function peopleText(people: PersonRow[]): string {
  return people
    .map(
      (p) =>
        `- id: ${p.key} | ${p.name} (${p.participant_type}, ${p.grade_label})\n  descriptor: ${p.descriptor}\n  background: ${p.background}; SES: ${p.ses}\n  tendencies: ${p.tendencies.join("; ")}\n  close with: ${p.close_with.join(", ") || "—"}; tension with: ${p.tension_with.join(", ") || "—"}\n  interests: ${p.interests.join(", ")}\n  knows: ${p.knows.join("; ")}\n  not visible to the teacher: ${p.hidden_from_teacher.join("; ")}`,
    )
    .join("\n");
}

export interface Chunk {
  id: string;
  source_name: string;
  chunk_index: number;
  content: string;
}

/**
 * Keyword + recency retrieval over the scenario's own context documents.
 * Deliberately behind a single interface so embedding-based retrieval can be
 * swapped in later without touching callers.
 */
export async function retrieveChunks(supabase: Client, scenarioId: string, query: string, limit = 8): Promise<Chunk[]> {
  const { data, error } = await supabase
    .from("document_chunks")
    .select("id, source_name, chunk_index, content, created_at")
    .eq("scenario_id", scenarioId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Chunk[];
  const terms = Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 3),
    ),
  );
  if (!terms.length) return rows.slice(0, limit);
  const scored = rows.map((r) => {
    const text = r.content.toLowerCase();
    const score = terms.reduce((acc, t) => acc + (text.includes(t) ? 1 : 0), 0);
    return { row: r, score };
  });
  const hits = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
  const chosen = hits.length ? hits : scored;
  return chosen.slice(0, limit).map((s) => s.row);
}

export function chunksText(chunks: Chunk[]): string {
  if (!chunks.length) return "(No context documents were provided.)";
  return chunks.map((c) => `[${c.source_name} · part ${c.chunk_index + 1}]\n${c.content}`).join("\n\n");
}

export async function loadActiveModelConfig(supabase: Client): Promise<ModelConfig> {
  const { data } = await supabase
    .from("model_configurations")
    .select("id, name, provider_type, model, endpoint, temperature, max_output")
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  return (data as unknown as ModelConfig | null) ?? FALLBACK_MODEL_CONFIG;
}
