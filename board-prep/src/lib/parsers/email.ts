import type { ParseResult } from "./index";
import { chunkText } from "../chunk";

// Email (.eml) (§8 Срез 3): one thread = one document; author and date go into
// chunk metadata.
export async function parseEml(data: Buffer): Promise<ParseResult> {
  const { simpleParser } = await import("mailparser");
  const mail = await simpleParser(data);

  const from = mail.from?.text ?? null;
  const date = mail.date ? mail.date.toISOString() : null;
  const subject = mail.subject ?? "";
  const body = mail.text ?? (mail.html ? stripHtml(mail.html) : "");

  const header = `Тема: ${subject}\nОт: ${from ?? "?"}\nДата: ${date ?? "?"}\n\n`;
  const text = header + body;

  const chunks = chunkText(text, { from, date, subject }).map((c, i) => ({ ...c, ord: i }));
  return { preview: text.slice(0, 4000), chunks };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
