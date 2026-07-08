import { Pool } from "pg";
import { config } from "./config";

// Single shared pool. In dev, Next.js hot-reload can re-import modules, so we
// stash the pool on globalThis to avoid exhausting connections.
declare global {
  // eslint-disable-next-line no-var
  var __bpaPool: Pool | undefined;
}

export const pool: Pool =
  global.__bpaPool ?? new Pool({ connectionString: config.databaseUrl });

if (process.env.NODE_ENV !== "production") global.__bpaPool = pool;

export async function query<T = any>(text: string, params?: unknown[]): Promise<T[]> {
  const res = await pool.query(text, params as any[]);
  return res.rows as T[];
}

export async function one<T = any>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
