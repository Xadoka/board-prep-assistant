import type { ParseResult } from "./index";
import { chunkText, type Chunk } from "../chunk";

// XLSX (§8 Срез 2): render each sheet as a markdown table so the model sees
// column headers next to their numbers. One document → chunks tagged by sheet.
export async function parseXlsx(data: Buffer): Promise<ParseResult> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(data, { type: "buffer" });

  const chunks: Chunk[] = [];
  const previews: string[] = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
    if (rows.length === 0) continue;

    const md = toMarkdownTable(rows);
    const section = `## Лист «${sheetName}»\n\n${md}`;
    previews.push(section);

    for (const c of chunkText(section, { sheet: sheetName })) {
      chunks.push({ ...c, ord: chunks.length });
    }
  }

  return { preview: previews.join("\n\n").slice(0, 4000), chunks };
}

function toMarkdownTable(rows: string[][]): string {
  if (rows.length === 0) return "";
  const width = Math.max(...rows.map((r) => r.length));
  const cell = (r: string[], i: number) => String(r[i] ?? "").replace(/\|/g, "\\|");
  const header = rows[0];
  const headerLine = `| ${Array.from({ length: width }, (_, i) => cell(header, i)).join(" | ")} |`;
  const sep = `| ${Array.from({ length: width }, () => "---").join(" | ")} |`;
  const body = rows
    .slice(1)
    .map((r) => `| ${Array.from({ length: width }, (_, i) => cell(r, i)).join(" | ")} |`)
    .join("\n");
  return [headerLine, sep, body].join("\n");
}
