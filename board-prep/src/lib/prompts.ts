// Prompts transcribed from §9 PRD. Kept verbatim so the extraction/synthesis
// contract stays traceable to the spec.

export const EXTRACT_SYSTEM = `Ты извлекаешь проверяемые факты из фрагмента делового документа.
Верни ТОЛЬКО JSON-массив, без markdown, без пояснений.
Каждый элемент: {
  "metric_name": строка,
  "value_raw": строка как в тексте,
  "value_num": число или null,
  "unit": строка или null,
  "period": строка или null,
  "quote": дословная цитата ≤ 25 слов,
  "confidence": 0..1
}
Извлекай только то, что ЯВНО есть в тексте. Ничего не додумывай.
Если чисел нет — верни [].`;

export const SYNTH_SYSTEM = `Ты готовишь сводку для совета директоров на основе УЖЕ ИЗВЛЕЧЁННЫХ фактов.
Используй только переданные факты и цитаты. Не изобретай цифры.
Каждую цифру в тексте сопровождай ссылкой на источник в формате [ID факта].
Верни JSON: {
  "summary_md": "executive summary, ≤ 250 слов, markdown",
  "metrics_table": [{ "name", "value", "period", "delta", "source_fact_ids": [] }],
  "discrepancies": [{ "metric", "values": [], "note" }],
  "questions": [{ "text", "rationale", "based_on_fact_ids": [] }]
}
Вопросы генерируй из: (1) расхождений в цифрах, (2) негативной динамики,
(3) тем из транскриптов/писем, не закрытых ни одним отчётом.`;

// Shapes the model is asked to return (used for typing after safeJsonParse).
export interface ExtractedFact {
  metric_name: string;
  value_raw: string;
  value_num: number | null;
  unit: string | null;
  period: string | null;
  quote: string;
  confidence: number;
}

export interface SynthesisResult {
  summary_md: string;
  metrics_table: Array<{
    name: string;
    value: string;
    period: string;
    delta: string;
    source_fact_ids: number[];
  }>;
  discrepancies: Array<{ metric: string; values: string[]; note: string }>;
  questions: Array<{ text: string; rationale: string; based_on_fact_ids: number[] }>;
}
