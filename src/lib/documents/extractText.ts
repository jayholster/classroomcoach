/** Browser-side text extraction for educator context documents. */
export async function extractDocumentText(file: File): Promise<{ text?: string; error?: string }> {
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth/mammoth.browser");
      const buf = await file.arrayBuffer();
      const result = await (
        mammoth as unknown as {
          extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
        }
      ).extractRawText({ arrayBuffer: buf });
      return { text: result.value };
    }
    if (name.endsWith(".pdf")) {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const buf = new Uint8Array(await file.arrayBuffer());
      const pdf = await getDocumentProxy(buf);
      const { text } = await extractText(pdf, { mergePages: true });
      return { text: Array.isArray(text) ? text.join("\n\n") : text };
    }
    if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
      return { text: await file.text() };
    }
    return { error: "Unsupported file type. Use TXT, MD, DOCX or PDF." };
  } catch (err) {
    return { error: `Could not read this file: ${(err as Error).message}` };
  }
}
