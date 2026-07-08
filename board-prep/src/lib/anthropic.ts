import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config";

// Single client. The SDK auto-retries 429/5xx/connection errors (default 2);
// we bump it and set a generous per-request timeout to satisfy §10 (retry + timeout).
const client = new Anthropic({
  apiKey: config.anthropicApiKey,
  maxRetries: 3,
  timeout: 120_000,
});

export interface ClaudeCallOptions {
  system: string;
  user: string;
  maxTokens: number;
}

/**
 * One-shot text completion. Returns the concatenated text of the response.
 * All LLM calls funnel through here so retry/timeout/logging live in one place (§10).
 *
 * Note: Sonnet 4.6 does not support structured outputs, so callers parse JSON
 * from the returned text with the fence-stripping helper below (§9 PRD).
 */
export async function callClaude(opts: ClaudeCallOptions): Promise<string> {
  const resp = await client.messages.create({
    model: config.model,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });

  return resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/**
 * Safely parse a JSON payload from a model response (§9 PRD):
 * strip markdown fences, JSON.parse, and on error return null so the caller
 * can log and skip the chunk rather than failing the whole document.
 */
export function safeJsonParse<T>(raw: string): T | null {
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) text = fence[1].trim();
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
