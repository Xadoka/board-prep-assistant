import { query } from "./db";
import type { Fact } from "./repo";

// Metric reconciliation (§8 Срез 5): group facts by canonical metric name +
// period; when values for one period differ, flag a discrepancy.

// Minimal name normalization. Extend this map as new aliases appear.
const CANON: Record<string, string> = {
  "выручка": "Выручка",
  "revenue": "Выручка",
  "выр.": "Выручка",
  "gross margin": "Валовая маржа",
  "валовая маржа": "Валовая маржа",
  "arr": "ARR",
  "nrr": "NRR",
  "churn": "Отток",
  "отток": "Отток",
};

export function canonical(name: string): string {
  return CANON[name.trim().toLowerCase()] ?? name.trim();
}

export interface ReconciledMetric {
  canonical_name: string;
  period: string | null;
  value_num: number | null;
  unit: string | null;
  source_fact_ids: number[];
  discrepancy: boolean;
  notes: string | null;
}

export function reconcile(allFacts: Fact[]): ReconciledMetric[] {
  const groups = new Map<string, Fact[]>();
  for (const f of allFacts) {
    if (f.value_num == null) continue;
    const key = `${canonical(f.metric_name)}|${f.period ?? ""}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(f);
  }

  const out: ReconciledMetric[] = [];
  for (const [key, fs] of groups) {
    const [name, period] = key.split("|");
    const distinct = [...new Set(fs.map((f) => f.value_num))];
    const discrepancy = distinct.length > 1;
    out.push({
      canonical_name: name,
      period: period || null,
      value_num: fs[0].value_num,
      unit: fs[0].unit,
      source_fact_ids: fs.map((f) => f.id),
      discrepancy,
      notes: discrepancy
        ? `Разные значения за период: ${distinct.join(", ")}`
        : null,
    });
  }
  return out;
}

/** Persist reconciled metrics for a packet's facts. */
export async function persistMetrics(metrics: ReconciledMetric[]): Promise<void> {
  for (const m of metrics) {
    await query(
      `INSERT INTO metrics (canonical_name, period, value_num, unit, source_fact_ids, discrepancy, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [m.canonical_name, m.period, m.value_num, m.unit, m.source_fact_ids, m.discrepancy, m.notes]
    );
  }
}
