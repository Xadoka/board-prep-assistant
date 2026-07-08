import { config } from "./config";

// Embeddings for semantic search (Срез 4). Anthropic has no embeddings endpoint,
// so this is a pluggable provider. Until one is configured, embedText returns
// null and the pipeline simply skips vector indexing (facts still extract fine).
//
// To enable: set EMBEDDINGS_PROVIDER (e.g. "voyage") + EMBEDDINGS_API_KEY and
// implement the call below. Keep the output dimension aligned with the
// chunks.embedding column in db/schema.sql (currently vector(1536)).

export async function embedText(_text: string): Promise<number[] | null> {
  if (!config.embeddings.provider || !config.embeddings.apiKey) return null;

  switch (config.embeddings.provider) {
    // case "voyage": {
    //   const r = await fetch("https://api.voyageai.com/v1/embeddings", {
    //     method: "POST",
    //     headers: {
    //       Authorization: `Bearer ${config.embeddings.apiKey}`,
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({ model: "voyage-3", input: _text }),
    //   });
    //   const j = await r.json();
    //   return j.data[0].embedding as number[];
    // }
    default:
      throw new Error(`Unsupported EMBEDDINGS_PROVIDER: ${config.embeddings.provider}`);
  }
}

/** pgvector literal, e.g. "[0.1,0.2,...]". */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
