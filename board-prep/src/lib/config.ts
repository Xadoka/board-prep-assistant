// Centralized env access. Secrets come only from the environment (§10 PRD).

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  // PRD §11 specifies claude-sonnet-4-6 for extraction and synthesis.
  model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  storageDriver: process.env.STORAGE_DRIVER ?? "local",
  storageDir: process.env.STORAGE_DIR ?? "./storage",
  embeddings: {
    provider: process.env.EMBEDDINGS_PROVIDER ?? "",
    apiKey: process.env.EMBEDDINGS_API_KEY ?? "",
  },
  // Chunking target from §8 (Срез 1): 500–1000 tokens.
  chunk: { minTokens: 500, maxTokens: 1000 },
} as const;
