import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "./config";

// Storage abstraction (§11 PRD): local folder on MVP, swappable for S3.
export interface Storage {
  /** Persist bytes and return an opaque storage_path stored in documents.storage_path. */
  save(originalName: string, data: Buffer): Promise<string>;
  read(storagePath: string): Promise<Buffer>;
}

class LocalStorage implements Storage {
  constructor(private dir: string) {}

  async save(originalName: string, data: Buffer): Promise<string> {
    await fs.mkdir(this.dir, { recursive: true });
    const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${randomUUID()}-${safe}`;
    await fs.writeFile(path.join(this.dir, key), data);
    return key; // relative key; resolve against STORAGE_DIR on read
  }

  async read(storagePath: string): Promise<Buffer> {
    return fs.readFile(path.join(this.dir, storagePath));
  }
}

// class S3Storage implements Storage { /* TODO: swap in for production (§11) */ }

export const storage: Storage = new LocalStorage(config.storageDir);
