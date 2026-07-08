import type { ParseResult } from "./index";
import { chunkText, type Chunk } from "../chunk";

// Transcript (.txt) (§8 Срез 2): expected format `[timestamp] Speaker: реплика`.
// We keep the speaker (and timestamp) in chunk metadata so a fact can point back
// to who said it (§4/§8).
const LINE = /^\s*(?:\[([^\]]+)\]\s*)?([^:]{1,60}?):\s*(.*)$/;

export async function parseTranscript(data: Buffer): Promise<ParseResult> {
  const text = data.toString("utf8");
  const lines = text.split(/\r?\n/);

  // Group consecutive lines by speaker into utterances.
  interface Utt {
    speaker: string | null;
    timestamp: string | null;
    text: string;
  }
  const utterances: Utt[] = [];
  for (const raw of lines) {
    if (!raw.trim()) continue;
    const m = raw.match(LINE);
    if (m) {
      utterances.push({ timestamp: m[1] ?? null, speaker: m[2].trim(), text: m[3].trim() });
    } else if (utterances.length) {
      utterances[utterances.length - 1].text += ` ${raw.trim()}`;
    } else {
      utterances.push({ timestamp: null, speaker: null, text: raw.trim() });
    }
  }

  // One chunk per utterance keeps speaker metadata precise; merge tiny ones via
  // chunkText only when a single utterance is large.
  const chunks: Chunk[] = [];
  for (const u of utterances) {
    const meta = { speaker: u.speaker, timestamp: u.timestamp };
    for (const c of chunkText(u.text, meta)) {
      chunks.push({ ...c, ord: chunks.length });
    }
  }

  return { preview: text.slice(0, 4000), chunks };
}
