import { callClaude, safeJsonParse } from "./anthropic";
import { EXTRACT_SYSTEM, type ExtractedFact } from "./prompts";
import { facts } from "./repo";

// Fact extraction (§9.1). One LLM call per chunk; parse the JSON array safely;
// on parse failure, log and skip the chunk (§9.1 / §10) rather than aborting the
// whole document. Idempotent writes via facts.upsert (§6).
export async function extractFactsForChunk(
  documentId: number,
  chunkId: number,
  chunkText: string,
  chunkMeta: Record<string, unknown>
): Promise<number> {
  const locationHint = describeLocation(chunkMeta);
  const user = `Метаданные фрагмента: ${locationHint}\n\nТекст фрагмента:\n${chunkText}`;

  let raw: string;
  try {
    raw = await callClaude({ system: EXTRACT_SYSTEM, user, maxTokens: 4096 });
  } catch (err) {
    console.error(`[extract] LLM call failed for doc ${documentId} chunk ${chunkId}:`, err);
    return 0;
  }

  const parsed = safeJsonParse<ExtractedFact[]>(raw);
  if (!Array.isArray(parsed)) {
    console.warn(`[extract] unparseable response for doc ${documentId} chunk ${chunkId}; skipping`);
    return 0;
  }

  let written = 0;
  for (const f of parsed) {
    if (!f || typeof f.metric_name !== "string") continue;
    await facts.upsert({
      document_id: documentId,
      chunk_id: chunkId,
      metric_name: f.metric_name,
      value_raw: f.value_raw ?? null,
      value_num: typeof f.value_num === "number" ? f.value_num : null,
      unit: f.unit ?? null,
      period: f.period ?? null,
      quote: f.quote ?? null,
      confidence: typeof f.confidence === "number" ? f.confidence : null,
    });
    written++;
  }
  return written;
}

function describeLocation(meta: Record<string, unknown>): string {
  const parts: string[] = [];
  if (meta.page) parts.push(`страница ${meta.page}`);
  if (meta.sheet) parts.push(`лист «${meta.sheet}»`);
  if (meta.speaker) parts.push(`спикер ${meta.speaker}`);
  if (meta.timestamp) parts.push(`время ${meta.timestamp}`);
  if (meta.from) parts.push(`письмо от ${meta.from}`);
  return parts.join(", ") || "—";
}
