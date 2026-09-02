import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CHUNK_SIZE = 1200;

function chunkText(text: string): string[] {
  const clean = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  const paragraphs = clean.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length > CHUNK_SIZE && current) {
      chunks.push(current.trim());
      current = p;
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
    while (current.length > CHUNK_SIZE * 1.5) {
      chunks.push(current.slice(0, CHUNK_SIZE).trim());
      current = current.slice(CHUNK_SIZE);
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export const createDocumentRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { scenarioId: string; fileName: string; mimeType: string; byteSize: number }) => input)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("context_documents")
      .insert({
        scenario_id: data.scenarioId,
        owner_id: context.userId,
        file_name: data.fileName,
        mime_type: data.mimeType,
        byte_size: data.byteSize,
        status: "Uploading",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string }).id };
  });

export const markDocumentUploaded = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { documentId: string; storagePath: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("context_documents")
      .update({ storage_path: data.storagePath, status: "Processing" })
      .eq("id", data.documentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Stores extracted text as retrievable chunks, or records an honest failure. */
export const finalizeDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { documentId: string; scenarioId: string; text?: string; error?: string }) => input)
  .handler(async ({ data, context }) => {
    if (data.error || !data.text?.trim()) {
      await context.supabase
        .from("context_documents")
        .update({
          status: "Failed",
          error_message: data.error ?? "No readable text could be extracted from this file.",
        })
        .eq("id", data.documentId);
      return { status: "Failed" as const, chunks: 0 };
    }

    const { data: doc } = await context.supabase
      .from("context_documents")
      .select("file_name")
      .eq("id", data.documentId)
      .maybeSingle();
    const sourceName = (doc as { file_name?: string } | null)?.file_name ?? "document";

    const chunks = chunkText(data.text);
    await context.supabase.from("document_chunks").delete().eq("document_id", data.documentId);
    if (chunks.length) {
      const { error } = await context.supabase.from("document_chunks").insert(
        chunks.map((content, index) => ({
          document_id: data.documentId,
          scenario_id: data.scenarioId,
          owner_id: context.userId,
          chunk_index: index,
          source_name: sourceName,
          content,
          char_count: content.length,
        })),
      );
      if (error) throw new Error(error.message);
    }

    await context.supabase
      .from("context_documents")
      .update({ status: "Ready", extracted_chars: data.text.length, error_message: null })
      .eq("id", data.documentId);

    return { status: "Ready" as const, chunks: chunks.length };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { documentId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("context_documents").delete().eq("id", data.documentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
