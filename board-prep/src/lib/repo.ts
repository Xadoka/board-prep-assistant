import { query, one } from "./db";
import type { SourceType } from "./parsers";

// Thin data-access layer over the tables in db/schema.sql.

export type DocStatus = "uploaded" | "parsing" | "parsed" | "extracted" | "failed";

export interface Document {
  id: number;
  source_type: SourceType;
  filename: string;
  storage_path: string;
  status: DocStatus;
  uploaded_at: string;
  meta_json: Record<string, unknown>;
}

export interface Fact {
  id: number;
  document_id: number;
  chunk_id: number | null;
  metric_name: string;
  value_raw: string | null;
  value_num: number | null;
  unit: string | null;
  period: string | null;
  quote: string | null;
  confidence: number | null;
}

export const packets = {
  list: () =>
    query(`SELECT * FROM packets ORDER BY created_at DESC`),
  create: (title: string) =>
    one<{ id: number }>(`INSERT INTO packets (title) VALUES ($1) RETURNING id`, [title]),
  get: (id: number) => one(`SELECT * FROM packets WHERE id = $1`, [id]),
  linkDocument: (packetId: number, documentId: number) =>
    query(
      `INSERT INTO packet_documents (packet_id, document_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [packetId, documentId]
    ),
  documentIds: async (packetId: number) =>
    (await query<{ document_id: number }>(
      `SELECT document_id FROM packet_documents WHERE packet_id = $1`,
      [packetId]
    )).map((r) => r.document_id),
  saveSynthesis: (id: number, summaryMd: string, questions: unknown) =>
    query(
      `UPDATE packets SET summary_md = $2, questions_json = $3, status = 'ready' WHERE id = $1`,
      [id, summaryMd, JSON.stringify(questions)]
    ),
};

export const documents = {
  create: (
    packetId: number,
    sourceType: SourceType,
    filename: string,
    storagePath: string
  ) =>
    one<Document>(
      `INSERT INTO documents (source_type, filename, storage_path)
       VALUES ($1, $2, $3) RETURNING *`,
      [sourceType, filename, storagePath]
    ),
  get: (id: number) => one<Document>(`SELECT * FROM documents WHERE id = $1`, [id]),
  byPacket: (packetId: number) =>
    query<Document>(
      `SELECT d.* FROM documents d
       JOIN packet_documents pd ON pd.document_id = d.id
       WHERE pd.packet_id = $1 ORDER BY d.uploaded_at`,
      [packetId]
    ),
  setStatus: (id: number, status: DocStatus, meta?: Record<string, unknown>) =>
    query(
      `UPDATE documents SET status = $2,
         meta_json = COALESCE(meta_json,'{}'::jsonb) || $3::jsonb
       WHERE id = $1`,
      [id, status, JSON.stringify(meta ?? {})]
    ),
};

export const chunks = {
  insert: (
    documentId: number,
    ord: number,
    text: string,
    tokenCount: number,
    meta: Record<string, unknown>,
    embeddingLiteral: string | null
  ) =>
    one<{ id: number }>(
      `INSERT INTO chunks (document_id, ord, text, token_count, meta_json, embedding)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::vector)
       ON CONFLICT (document_id, ord) DO UPDATE SET text = EXCLUDED.text
       RETURNING id`,
      [documentId, ord, text, tokenCount, JSON.stringify(meta), embeddingLiteral]
    ),
  byDocument: (documentId: number) =>
    query<{ id: number; ord: number; text: string; meta_json: Record<string, unknown> }>(
      `SELECT id, ord, text, meta_json FROM chunks WHERE document_id = $1 ORDER BY ord`,
      [documentId]
    ),
};

export const facts = {
  // Idempotent upsert on (document_id, chunk_id, metric_name) — §6.
  upsert: (f: Omit<Fact, "id">) =>
    query(
      `INSERT INTO facts
         (document_id, chunk_id, metric_name, value_raw, value_num, unit, period, quote, confidence)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (document_id, chunk_id, metric_name)
       DO UPDATE SET value_raw = EXCLUDED.value_raw, value_num = EXCLUDED.value_num,
         unit = EXCLUDED.unit, period = EXCLUDED.period, quote = EXCLUDED.quote,
         confidence = EXCLUDED.confidence`,
      [
        f.document_id, f.chunk_id, f.metric_name, f.value_raw, f.value_num,
        f.unit, f.period, f.quote, f.confidence,
      ]
    ),
  byDocument: (documentId: number) =>
    query<Fact>(`SELECT * FROM facts WHERE document_id = $1 ORDER BY id`, [documentId]),
  byPacket: (packetId: number) =>
    query<Fact>(
      `SELECT f.* FROM facts f
       JOIN packet_documents pd ON pd.document_id = f.document_id
       WHERE pd.packet_id = $1 ORDER BY f.id`,
      [packetId]
    ),
  update: (id: number, patch: Partial<Pick<Fact, "value_raw" | "value_num" | "unit" | "period">>) =>
    query(
      `UPDATE facts SET
         value_raw = COALESCE($2, value_raw),
         value_num = COALESCE($3, value_num),
         unit = COALESCE($4, unit),
         period = COALESCE($5, period)
       WHERE id = $1`,
      [id, patch.value_raw ?? null, patch.value_num ?? null, patch.unit ?? null, patch.period ?? null]
    ),
  remove: (id: number) => query(`DELETE FROM facts WHERE id = $1`, [id]),
};
