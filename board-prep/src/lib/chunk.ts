import { config } from "./config";

// Rough token estimate. For accurate counts, call Anthropic's count_tokens;
// a ~4-chars-per-token heuristic is sufficient for windowing (§8 Срез 1).
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface Chunk {
  ord: number;
  text: string;
  tokenCount: number;
  meta: Record<string, unknown>;
}

/**
 * Split text into 500–1000 token windows on paragraph boundaries where possible.
 * `baseMeta` is attached to every chunk (e.g. page number, speaker) so facts stay
 * traceable to their location (§4 PRD).
 */
export function chunkText(text: string, baseMeta: Record<string, unknown> = {}): Chunk[] {
  const maxChars = config.chunk.maxTokens * 4;
  const minChars = config.chunk.minTokens * 4;
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const chunks: Chunk[] = [];
  let buf = "";

  const flush = () => {
    const t = buf.trim();
    if (!t) return;
    chunks.push({ ord: chunks.length, text: t, tokenCount: estimateTokens(t), meta: baseMeta });
    buf = "";
  };

  for (const para of paragraphs) {
    if (buf && (buf.length + para.length) > maxChars) flush();
    // A single oversized paragraph is hard-split so we never exceed the window.
    if (para.length > maxChars) {
      for (let i = 0; i < para.length; i += maxChars) {
        buf = para.slice(i, i + maxChars);
        flush();
      }
      continue;
    }
    buf = buf ? `${buf}\n\n${para}` : para;
    if (buf.length >= minChars) flush();
  }
  flush();
  return chunks;
}
