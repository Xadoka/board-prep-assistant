import type { ParseResult } from "./index";
import { chunkText } from "../chunk";

// DOCX via mammoth (§8 Срез 2).
export async function parseDocx(data: Buffer): Promise<ParseResult> {
  const mammoth = await import("mammoth");
  const { value: text } = await mammoth.extractRawText({ buffer: data });
  return { preview: text.slice(0, 4000), chunks: chunkText(text) };
}
