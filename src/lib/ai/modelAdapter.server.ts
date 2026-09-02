/**
 * Single provider abstraction for every Classroom Coach model call.
 *
 * The active row in `model_configurations` decides which provider is used:
 *  - `lovable_ai`        → Lovable AI Gateway (no key handling in app code)
 *  - `openai_compatible` → any OpenAI-compatible endpoint (e.g. a university
 *                          hosted model), credentials read from server env.
 *
 * Nothing in this file may be imported from client code.
 */

export interface ModelUsageResult {
  text: string;
  inputTokens: number | null;
  outputTokens: number | null;
  model?: string;
  provider?: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider_type: string;
  model: string;
  endpoint: string | null;
  temperature: number | null;
  max_output: number | null;
}

export const FALLBACK_MODEL_CONFIG: ModelConfig = {
  id: "00000000-0000-0000-0000-000000000000",
  name: "Default (Lovable AI)",
  provider_type: "lovable_ai",
  model: "openai/gpt-5.6-sol",
  endpoint: null,
  temperature: null,
  max_output: null,
};

export class ModelCallError extends Error {
  status: number;
  retryable: boolean;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.retryable = status === 429 || status >= 500;
  }
}

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

function gatewayKey(): string {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new ModelCallError("The AI service is not configured for this workspace.", 401);
  return key;
}

function describeStatus(status: number, body: string): string {
  if (status === 402) return "This workspace is out of AI credits. Add credits to continue generating.";
  if (status === 403) return "AI access is currently blocked for this workspace.";
  if (status === 429) return "The AI service is rate limited right now. Try again in a moment.";
  if (status >= 500) return "The AI service is temporarily unavailable. Try again shortly.";
  return `The AI service rejected the request (${status}): ${body.slice(0, 300)}`;
}

/** Reads an SSE stream from the Responses API and returns the accumulated text. */
async function readResponsesStream(res: Response): Promise<ModelUsageResult> {
  const reader = res.body?.getReader();
  if (!reader) throw new ModelCallError("The AI service returned an empty response.", 502);
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          response?: { output_text?: string; usage?: { input_tokens?: number; output_tokens?: number } };
        };
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") text += evt.delta;
        if (evt.type === "response.completed") {
          if (!text && evt.response?.output_text) text = evt.response.output_text;
          if (evt.response?.usage) {
            inputTokens = evt.response.usage.input_tokens ?? null;
            outputTokens = evt.response.usage.output_tokens ?? null;
          }
        }
      } catch {
        /* ignore malformed keep-alive frames */
      }
    }
  }
  return { text, inputTokens, outputTokens };
}

async function callLovableResponses(
  config: ModelConfig,
  system: string,
  user: string,
  signal?: AbortSignal,
): Promise<ModelUsageResult> {
  const res = await fetch(`${GATEWAY}/responses`, {
    method: "POST",
    ...(signal ? { signal } : {}),
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": gatewayKey(),
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: config.model,
      instructions: system,
      input: [{ role: "user", content: [{ type: "input_text", text: user }] }],
      stream: true,
      store: false,
      text: { format: { type: "json_object" } },
      reasoning: { effort: "low", summary: "auto" },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new ModelCallError(describeStatus(res.status, body), res.status);
  }
  return readResponsesStream(res);
}

async function readChatStream(res: Response, config: ModelConfig): Promise<ModelUsageResult> {
  const reader = res.body?.getReader();
  if (!reader) throw new ModelCallError("The AI service returned an empty response.", 502);
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload) as {
          choices?: { delta?: { content?: string }; message?: { content?: string } }[];
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        const choice = evt.choices?.[0];
        if (choice?.delta?.content) text += choice.delta.content;
        if (!choice?.delta && choice?.message?.content) text += choice.message.content;
        inputTokens = evt.usage?.prompt_tokens ?? inputTokens;
        outputTokens = evt.usage?.completion_tokens ?? outputTokens;
      } catch {
        /* ignore malformed keep-alive frames */
      }
    }
  }
  return { text, inputTokens, outputTokens, model: config.model, provider: config.provider_type };
}

async function callChatCompletions(
  config: ModelConfig,
  system: string,
  user: string,
  baseUrl: string,
  apiKey: string,
  useGatewayHeader: boolean,
  signal?: AbortSignal,
): Promise<ModelUsageResult> {
  const body: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  };
  if (config.temperature !== null && !config.model.startsWith("openai/gpt-5")) {
    body["temperature"] = config.temperature;
  }
  // Gemini models support the provider's priority tier, which keeps live
  // rehearsal turns responsive.
  if (useGatewayHeader && config.model.startsWith("google/gemini-")) {
    body["service_tier"] = "priority";
    body["stream"] = true;
  }
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    ...(signal ? { signal } : {}),
    headers: {
      "Content-Type": "application/json",
      ...(useGatewayHeader ? { "Lovable-API-Key": apiKey } : { Authorization: `Bearer ${apiKey}` }),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ModelCallError(describeStatus(res.status, text), res.status);
  }
  if (useGatewayHeader && config.model.startsWith("google/gemini-")) return readChatStream(res, config);
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    text: json.choices?.[0]?.message?.content ?? "",
    inputTokens: json.usage?.prompt_tokens ?? null,
    outputTokens: json.usage?.completion_tokens ?? null,
    model: config.model,
    provider: config.provider_type,
  };
}

/** Calls the configured model and returns raw text plus token usage. */
export async function callModelText(
  config: ModelConfig,
  system: string,
  user: string,
  signal?: AbortSignal,
): Promise<ModelUsageResult> {
  if (config.provider_type === "openai_compatible") {
    const endpoint = config.endpoint;
    if (!endpoint) throw new ModelCallError("This model configuration has no endpoint URL.", 400);
    const reference = (config as { credentials_reference?: string | null }).credentials_reference ?? null;
    const { modelCredential } = await import("../server/env.server");
    const key = modelCredential(reference) ?? process.env["EXTERNAL_MODEL_API_KEY"];
    if (!key) throw new ModelCallError("No credential is configured for the external model endpoint.", 401);
    return callChatCompletions(config, system, user, endpoint, key, false, signal);
  }
  if (config.model.startsWith("openai/")) return callLovableResponses(config, system, user, signal);
  return callChatCompletions(config, system, user, GATEWAY, gatewayKey(), true, signal);
}

/** Extracts the first JSON object from a model response. */
export function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new ModelCallError("The model returned a response that could not be read as JSON.", 502);
  }
}

/**
 * Calls the model, parses JSON, and makes exactly one repair attempt when the
 * first response is malformed. Never fabricates content.
 */
export async function callModelJson(
  config: ModelConfig,
  system: string,
  user: string,
): Promise<{ value: unknown; raw: string; repaired: boolean }> {
  const { text: raw } = await callModelText(config, system, user);
  try {
    return { value: extractJson(raw), raw, repaired: false };
  } catch {
    const repairPrompt = `Your previous reply was not valid JSON. Return the same content again as a single valid JSON object and nothing else.\n\nPrevious reply:\n${raw.slice(0, 6000)}`;
    const { text: second } = await callModelText(config, system, repairPrompt);
    return { value: extractJson(second), raw: second, repaired: true };
  }
}
