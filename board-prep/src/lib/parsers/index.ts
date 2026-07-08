import path from "node:path";
import type { Chunk } from "../chunk";
import { chunkText } from "../chunk";
import { parsePdf } from "./pdf";
import { parseDocx } from "./docx";
import { parseXlsx } from "./xlsx";
import { parseTranscript } from "./transcript";
import { parseEml } from "./email";

export type SourceType = "report" | "transcript" | "email";

export interface ParseResult {
  /** Human-readable preview of the parsed text (§7.2). */
  preview: string;
  chunks: Chunk[];
}

/** Infer a source_type from the filename extension. */
export function inferSourceType(filename: string): SourceType {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".eml" || ext === ".mbox") return "email";
  if (ext === ".txt") return "transcript"; // .txt transcripts (§7.2)
  return "report"; // pdf, docx, xlsx
}

/**
 * Dispatch parsing by extension and produce chunks. Each parser returns text
 * (+ per-chunk metadata like page/speaker); chunking is shared. A failure here
 * bubbles up so the worker can mark the single document `failed` without
 * blocking others (§10).
 */
export async function parseDocument(
  filename: string,
  data: Buffer
): Promise<ParseResult> {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".pdf":
      return parsePdf(data);
    case ".docx":
      return parseDocx(data);
    case ".xlsx":
    case ".xls":
      return parseXlsx(data);
    case ".eml":
      return parseEml(data);
    case ".txt":
      return parseTranscript(data);
    default: {
      // Fallback: treat as UTF-8 text.
      const text = data.toString("utf8");
      return { preview: text.slice(0, 4000), chunks: chunkText(text) };
    }
  }
}
