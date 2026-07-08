import { callClaude, safeJsonParse } from "./anthropic";
import { SYNTH_SYSTEM, type SynthesisResult } from "./prompts";
import { facts, packets } from "./repo";
import { reconcile } from "./reconcile";

// Synthesis (§9.2): feed the verified facts (JSON) to Claude and store the
// resulting packet. Only reconciled/verified facts are passed — the model never
// sees raw documents, which is what keeps every number traceable (§4).
export async function synthesizePacket(packetId: number): Promise<SynthesisResult> {
  const allFacts = await facts.byPacket(packetId);
  if (allFacts.length === 0) {
    throw new Error("No facts to synthesize — extract facts first.");
  }

  // Pre-compute discrepancies so the prompt can lean on them for questions.
  const reconciled = reconcile(allFacts);
  const discrepancies = reconciled.filter((m) => m.discrepancy);

  const payload = {
    facts: allFacts.map((f) => ({
      id: f.id,
      metric: f.metric_name,
      value_raw: f.value_raw,
      value_num: f.value_num,
      unit: f.unit,
      period: f.period,
      quote: f.quote,
      confidence: f.confidence,
      document_id: f.document_id,
    })),
    known_discrepancies: discrepancies.map((d) => ({
      metric: d.canonical_name,
      period: d.period,
      source_fact_ids: d.source_fact_ids,
      note: d.notes,
    })),
  };

  const raw = await callClaude({
    system: SYNTH_SYSTEM,
    // TODO (Срез 4): instead of all facts, retrieve top-K relevant chunks/facts
    // per packet section via pgvector before synthesis.
    user: `Проверенные факты (JSON):\n${JSON.stringify(payload, null, 2)}`,
    maxTokens: 8192,
  });

  const parsed = safeJsonParse<SynthesisResult>(raw);
  if (!parsed || typeof parsed.summary_md !== "string") {
    throw new Error("Synthesis returned malformed JSON");
  }

  await packets.saveSynthesis(packetId, parsed.summary_md, parsed.questions ?? []);
  return parsed;
}
