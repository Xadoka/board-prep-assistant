-- Board Prep Assistant — data model (§6 PRD)
-- Requires Postgres with the pgvector extension.

CREATE EXTENSION IF NOT EXISTS vector;

-- source_type ∈ {report, transcript, email}
-- status: uploaded → parsing → parsed → extracted → failed
CREATE TABLE IF NOT EXISTS documents (
  id           BIGSERIAL PRIMARY KEY,
  source_type  TEXT NOT NULL CHECK (source_type IN ('report', 'transcript', 'email')),
  filename     TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'uploaded'
                 CHECK (status IN ('uploaded','parsing','parsed','extracted','failed')),
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  meta_json    JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS chunks (
  id          BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  ord         INT NOT NULL,
  text        TEXT NOT NULL,
  token_count INT NOT NULL DEFAULT 0,
  embedding   vector(1536),               -- nullable: only populated when embeddings are configured (Срез 4)
  meta_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (document_id, ord)
);

CREATE TABLE IF NOT EXISTS facts (
  id          BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_id    BIGINT REFERENCES chunks(id) ON DELETE SET NULL,
  metric_name TEXT NOT NULL,
  value_raw   TEXT,
  value_num   DOUBLE PRECISION,
  unit        TEXT,
  period      TEXT,
  quote       TEXT,
  confidence  DOUBLE PRECISION,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Idempotency of processing (§6): re-running extraction must not create duplicates.
  UNIQUE (document_id, chunk_id, metric_name)
);

-- Reconciled metrics (Срез 5)
CREATE TABLE IF NOT EXISTS metrics (
  id             BIGSERIAL PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  period         TEXT,
  value_num      DOUBLE PRECISION,
  unit           TEXT,
  source_fact_ids BIGINT[] NOT NULL DEFAULT '{}',
  discrepancy    BOOLEAN NOT NULL DEFAULT false,
  notes          TEXT
);

CREATE TABLE IF NOT EXISTS packets (
  id             BIGSERIAL PRIMARY KEY,
  title          TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  summary_md     TEXT,
  questions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status         TEXT NOT NULL DEFAULT 'draft'
);

CREATE TABLE IF NOT EXISTS packet_documents (
  packet_id   BIGINT NOT NULL REFERENCES packets(id) ON DELETE CASCADE,
  document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  PRIMARY KEY (packet_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_facts_document ON facts(document_id);
-- Approximate-NN index for semantic search; safe to create even when embeddings are empty.
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
