# Board Prep Assistant — backend

Full-stack skeleton implementing the RAG pipeline from [`../PRD.md`](../PRD.md)
(§5–§11): **ingest → parse & chunk → extract verifiable facts (Claude) →
reconcile → synthesize board packet (Claude)**.

The static UI prototype lives at the repo root ([`../index.html`](../index.html),
published to GitHub Pages). This directory is the server that would back it.

## Stack

- **Next.js** (App Router, TypeScript) — front + API routes (§11)
- **Postgres + pgvector** — metadata, chunks, facts, packets (§6)
- **Anthropic Claude** — extraction + synthesis. Model via `ANTHROPIC_MODEL`
  (default `claude-sonnet-4-6`, per PRD §11; `claude-opus-4-8` for higher quality)
- **Local file storage** — `./storage`, abstracted behind a `Storage` interface for S3 (§11)
- **In-process worker** — sequential queue; per-document isolation (§10, §11)

## Prerequisites

- Node.js 20+
- Postgres 15+ with the `pgvector` extension available
- An Anthropic API key

## Setup

```bash
cd board-prep
npm install
cp .env.example .env          # fill in ANTHROPIC_API_KEY and DATABASE_URL
npm run db:init               # applies db/schema.sql (creates the vector extension + tables)
npm run dev                   # http://localhost:3000
```

## API (§7 screens map to these)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/packets` | list preparations (Dashboard) |
| `POST` | `/api/packets` | create a preparation |
| `GET` | `/api/packets/:id` | packet detail: documents, facts, discrepancies |
| `POST` | `/api/packets/:id/documents` | multipart upload → async parse/chunk/extract |
| `GET` | `/api/packets/:id/documents` | list documents with status |
| `POST` | `/api/packets/:id/synthesize` | synthesize packet from verified facts |
| `GET` | `/api/packets/:id/export?format=docx\|pdf` | export (Срез 6 — stub, 501) |
| `GET` | `/api/documents/:id` | status + parsed-text preview |
| `GET` | `/api/documents/:id/facts` | facts for a document |
| `PATCH` / `DELETE` | `/api/facts/:id` | edit / delete a fact before synthesis |

### Quick smoke test

```bash
# create a packet
curl -s -X POST localhost:3000/api/packets -H 'content-type: application/json' \
  -d '{"title":"Q3 2026"}'

# upload a file (id from the previous response)
curl -s -X POST localhost:3000/api/packets/1/documents -F 'files=@/path/to/Q3.xlsx'

# poll status, then synthesize
curl -s localhost:3000/api/packets/1
curl -s -X POST localhost:3000/api/packets/1/synthesize
```

## Map to the PRD build slices (§8)

| Slice | Where |
|---|---|
| 1 — PDF MVP end-to-end | `parsers/pdf.ts`, `chunk.ts`, `extract.ts`, `synthesize.ts` |
| 2 — XLSX / DOCX / transcripts | `parsers/{xlsx,docx,transcript}.ts` |
| 3 — email | `parsers/email.ts` |
| 4 — semantic search | `embeddings.ts` (pluggable), `chunks.embedding` column |
| 5 — reconciliation & questions | `reconcile.ts`, synthesis prompt (§9.2) |
| 6 — export DOCX/PDF | `api/packets/[id]/export` (stub) |

## What's implemented vs stubbed

**Implemented:** schema, storage, chunking, all five parsers, per-chunk
fact extraction with safe JSON parsing + idempotent upserts, metric
reconciliation, synthesis, the in-process worker, and all API routes.

**Stubbed (clearly marked with TODO):** embeddings provider (Anthropic has no
embeddings endpoint — plug in Voyage/OpenAI), top-K retrieval at synthesis time
(Срез 4), and DOCX/PDF export (Срез 6). React screens are not built — the
`index.html` prototype is the visual reference.

## Notes on the Claude integration (§9, §10)

- All LLM calls funnel through `lib/anthropic.ts` (`callClaude`) with SDK retries
  (`maxRetries: 3`) and a 120s timeout.
- Responses are parsed with `safeJsonParse` (strips ``` fences, `JSON.parse`,
  returns `null` on error so a bad chunk is skipped, not fatal).
- Sonnet 4.6 doesn't support structured outputs, so extraction relies on the
  strict JSON-array contract in the system prompt (§9.1) plus safe parsing.
- The secret (`ANTHROPIC_API_KEY`) is read only from the environment (§10).
