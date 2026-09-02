import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CHUNK_SIZE = 1200;

/** Hard limits enforced on the server, not just in the browser. */
export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;
export const ALLOWED_DOCUMENT_TYPES = [
  "text/plain",
  "text/markdown",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
] as const;
const ALLOWED_EXTENSIONS = [".txt", ".md", ".pdf", ".docx", ".doc"];

function validateUpload(fileName: string, mimeType: string, byteSize: number): void {
  if (byteSize <= 0) throw new Error("That file appears to be empty.");
  if (byteSize > MAX_DOCUMENT_BYTES) {
    throw new Error("That file is larger than the 15 MB limit. Split it or upload the relevant section.");
  }
  const lower = fileName.toLowerCase();
  const extensionOk = ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
  const typeOk = (ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(mimeType);
  if (!extensionOk && !typeOk) {
    throw new Error("Only plain text, Markdown, PDF and Word documents can be used as context.");
  }
}

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
    const { resolveCaller, requireAuthoring } = await import("../server/orgContext.server");
    const { writeAudit } = await import("../server/audit.server");
    const caller = await resolveCaller(context.supabase, context.userId);
    const organizationId = requireAuthoring(caller);
    validateUpload(data.fileName, data.mimeType, data.byteSize);

    const { data: row, error } = await context.supabase
      .from("context_documents")
      .insert({
        scenario_id: data.scenarioId,
        owner_id: context.userId,
        organization_id: organizationId,
        file_name: data.fileName,
        mime_type: data.mimeType,
        byte_size: data.byteSize,
        status: "Uploading",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const id = (row as { id: string }).id;
    await writeAudit(context.supabase, {
      action: "document.uploaded",
      objectType: "context_document",
      objectId: id,
      organizationId,
      actorId: context.userId,
      actorEmail: caller.email,
      metadata: { file_name: data.fileName, byte_size: data.byteSize, mime_type: data.mimeType },
    });
    return { id };
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
      .select("file_name, organization_id")
      .eq("id", data.documentId)
      .maybeSingle();
    const docRow = doc as { file_name?: string; organization_id?: string | null } | null;
    const sourceName = docRow?.file_name ?? "document";
    const orgId = docRow?.organization_id ?? null;

    const chunks = chunkText(data.text);
    await context.supabase.from("document_chunks").delete().eq("document_id", data.documentId);
    if (chunks.length) {
      const { error } = await context.supabase.from("document_chunks").insert(
        chunks.map((content, index) => ({
          document_id: data.documentId,
          scenario_id: data.scenarioId,
          owner_id: context.userId,
          organization_id: orgId,
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
    const { writeAudit } = await import("../server/audit.server");
    const { documentBucket } = await import("../server/env.server");
    const { data: doc } = await context.supabase
      .from("context_documents")
      .select("storage_path, organization_id, file_name")
      .eq("id", data.documentId)
      .maybeSingle();
    const row = doc as { storage_path?: string | null; organization_id?: string | null; file_name?: string } | null;

    const { error } = await context.supabase.from("context_documents").delete().eq("id", data.documentId);
    if (error) throw new Error(error.message);

    // Remove the stored file too, so deletion in the interface is real deletion.
    if (row?.storage_path) {
      await context.supabase.storage.from(documentBucket()).remove([row.storage_path]);
    }

    await writeAudit(context.supabase, {
      action: "document.deleted",
      objectType: "context_document",
      objectId: data.documentId,
      organizationId: row?.organization_id ?? null,
      actorId: context.userId,
      metadata: { file_name: row?.file_name ?? null },
    });
    return { ok: true };
  });
