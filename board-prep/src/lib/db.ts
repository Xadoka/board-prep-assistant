import { Pool } from "pg";
import { config } from "./config";

// Lazily create a single shared pool. Lazy init matters: Next.js imports route
// modules at build time (to collect page data), and reading DATABASE_URL / opening
// a pool at import would crash the build in environments without the env set.
// In dev, hot-reload re-imports modules, so we stash the pool on globalThis.
declare global {
  // eslint-disable-next-line no-var
  var __bpaPool: Pool | undefined;
}

function getPool(): Pool {
  if (!global.__bpaPool) {
    global.__bpaPool = new Pool({ connectionString: config.databaseUrl });
  }
  return global.__bpaPool;
}

export async function query<T = any>(text: string, params?: unknown[]): Promise<T[]> {
  const res = await getPool().query(text, params as any[]);
  return res.rows as T[];
}

export async function one<T = any>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
