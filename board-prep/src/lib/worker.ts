import { storage } from "./storage";
import { parseDocument } from "./parsers";
import { documents, chunks as chunkRepo } from "./repo";
import { extractFactsForChunk } from "./extract";
import { embedText, toVectorLiteral } from "./embeddings";

// In-process worker (§11): a simple sequential queue. Each document runs the
// pipeline independently, wrapped in try/catch so a broken file is marked
// `failed` without blocking the rest (§10). Swap for a real queue later.

type Job = { documentId: number };

const queue: Job[] = [];
let running = false;

export function enqueueDocument(documentId: number): void {
  queue.push({ documentId });
  void drain();
}

async function drain(): Promise<void> {
  if (running) return;
  running = true;
  try {
    while (queue.length) {
      const job = queue.shift()!;
      await processDocument(job.documentId).catch((err) => {
        console.error(`[worker] document ${job.documentId} failed:`, err);
      });
    }
  } finally {
    running = false;
  }
}

// Pipeline: uploaded → parsing → parsed → extracted (or failed).
async function processDocument(documentId: number): Promise<void> {
  const doc = await documents.get(documentId);
  if (!doc) return;

  try {
    await documents.setStatus(documentId, "parsing");
    const data = await storage.read(doc.storage_path);
    const { preview, chunks } = await parseDocument(doc.filename, data);

    // Persist chunks (+ optional embeddings for semantic search, Срез 4).
    const chunkIds: Array<{ id: number; text: string; meta: Record<string, unknown> }> = [];
    for (const c of chunks) {
      let embLiteral: string | null = null;
      try {
        const emb = await embedText(c.text);
        if (emb) embLiteral = toVectorLiteral(emb);
      } catch (e) {
        console.warn(`[worker] embedding failed (continuing without vector):`, e);
      }
      const row = await chunkRepo.insert(documentId, c.ord, c.text, c.tokenCount, c.meta, embLiteral);
      if (row) chunkIds.push({ id: row.id, text: c.text, meta: c.meta });
    }

    await documents.setStatus(documentId, "parsed", { preview, chunk_count: chunkIds.length });

    // Fact extraction per chunk (§9.1).
    let total = 0;
    for (const ch of chunkIds) {
      total += await extractFactsForChunk(documentId, ch.id, ch.text, ch.meta);
    }

    await documents.setStatus(documentId, "extracted", { fact_count: total });
  } catch (err) {
    await documents.setStatus(documentId, "failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
