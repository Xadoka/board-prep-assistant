import type { ParseResult } from "./index";
import { chunkText, type Chunk } from "../chunk";

// PDF parsing (§8 Срез 1): parse page-by-page and chunk. pdf-parse gives us
// full text plus a per-page hook so we can tag chunks with their page number.
export async function parsePdf(data: Buffer): Promise<ParseResult> {
  const pdfParse = (await import("pdf-parse")).default;

  const pages: string[] = [];
  await pdfParse(data, {
    pagerender: async (pageData: any) => {
      const content = await pageData.getTextContent();
      const text = content.items.map((it: any) => it.str).join(" ");
      pages.push(text);
      return text;
    },
  });

  const chunks: Chunk[] = [];
  pages.forEach((pageText, i) => {
    for (const c of chunkText(pageText, { page: i + 1 })) {
      chunks.push({ ...c, ord: chunks.length });
    }
  });

  const preview = pages.join("\n\n").slice(0, 4000);
  return { preview, chunks };
}
