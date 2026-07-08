"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API, toast, type Fact, type DocumentRow, type Discrepancy } from "../../../_lib/api";
import FactModal from "../../../_components/FactModal";

// §7.3 Ревью фактов — verify facts before synthesis: edit, delete, flag conflicts.
export default function FactsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [facts, setFacts] = useState<Fact[]>([]);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [conflicts, setConflicts] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [synth, setSynth] = useState(false);
  const [selected, setSelected] = useState<Fact | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await API.packet(id);
      setFacts(d.facts);
      setDocs(d.documents);
      const ids = new Set<number>();
      d.discrepancies.forEach((c: Discrepancy) => c.source_fact_ids.forEach((i) => ids.add(i)));
      setConflicts(ids);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function saveEdit(f: Fact) {
    const m = draft.match(/-?\d[\d.,]*/);
    const value_num = m ? parseFloat(m[0].replace(/,/g, "")) : undefined;
    setEditing(null);
    try {
      await API.updateFact(f.id, { value_raw: draft, value_num });
      await load();
      toast("Факт обновлён");
    } catch (e) {
      toast((e as Error).message);
    }
  }

  async function del(f: Fact) {
    if (!confirm(`Удалить факт F${f.id}?`)) return;
    try {
      await API.deleteFact(f.id);
      await load();
      toast("Факт удалён");
    } catch (e) {
      toast((e as Error).message);
    }
  }

  async function synthesize() {
    setSynth(true);
    try {
      await API.synthesize(id);
      toast("Packet синтезирован");
      router.push(`/packets/${id}/packet`);
    } catch (e) {
      toast((e as Error).message);
      setSynth(false);
    }
  }

  const docName = (docId: number) => docs.find((d) => d.id === docId)?.filename ?? `#${docId}`;
  const confColor = (c: number) => (c >= 0.85 ? "var(--ok)" : c >= 0.65 ? "var(--warn)" : "var(--err)");

  return (
    <div className="main">
      <div className="topbar">
        <div>
          <h1>Ревью фактов</h1>
          <div className="sub">Проверьте извлечённые факты перед синтезом</div>
        </div>
        <div className="right">
          <button className="btn" onClick={synthesize} disabled={synth || facts.length === 0}>
            {synth ? <span className="spinner" /> : "⚡"} Синтезировать packet
          </button>
        </div>
      </div>
      <div className="content">
        <p className="muted" style={{ margin: "0 0 14px" }}>
          Конфликтующие значения одной метрики подсвечены. Строки с низкой уверенностью приглушены.
          Отредактируйте или удалите сомнительные факты до синтеза — это ключевой экран доверия к результату.
        </p>

        {loading && <p className="muted">Загрузка…</p>}
        {!loading && facts.length === 0 && (
          <div className="empty">
            <div style={{ fontWeight: 600, color: "var(--text)" }}>Фактов пока нет</div>
            <div style={{ margin: "6px 0 18px" }}>Загрузите источники и дождитесь извлечения.</div>
            <button className="btn" onClick={() => router.push(`/packets/${id}/sources`)}>
              → К источникам
            </button>
          </div>
        )}

        {facts.length > 0 && (
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Метрика</th><th>Значение</th><th>Период</th>
                  <th>Источник · цитата</th><th>Уверенность</th><th></th>
                </tr>
              </thead>
              <tbody>
                {facts.map((f) => {
                  const conflict = conflicts.has(f.id);
                  const dim = (f.confidence ?? 1) < 0.6;
                  return (
                    <tr key={f.id} className={`${conflict ? "conflict" : ""} ${dim ? "dim" : ""}`}>
                      <td><span className="pill" style={{ fontSize: 10, background: "var(--accent-soft)", color: "var(--accent)" }}>F{f.id}</span></td>
                      <td className="metric-name">
                        {f.metric_name}{" "}
                        {conflict && <span className="pill warn" style={{ fontSize: 10 }}>⚠ расхождение</span>}
                      </td>
                      <td>
                        {editing === f.id ? (
                          <input
                            className="cell-edit"
                            autoFocus
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={() => saveEdit(f)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit(f);
                              if (e.key === "Escape") setEditing(null);
                            }}
                          />
                        ) : (
                          f.value_raw ?? "—"
                        )}
                      </td>
                      <td>{f.period ?? "—"}</td>
                      <td>
                        <span className="src-tag" onClick={() => setSelected(f)}>{docName(f.document_id)} ↗</span>
                        {f.quote && (
                          <div className="quote">«{f.quote.slice(0, 70)}{f.quote.length > 70 ? "…" : ""}»</div>
                        )}
                      </td>
                      <td>
                        {f.confidence != null ? (
                          <span className="conf-bar">
                            <span className="t"><i style={{ width: `${Math.round(f.confidence * 100)}%`, background: confColor(f.confidence) }} /></span>
                            <span className="muted">{f.confidence.toFixed(2)}</span>
                          </span>
                        ) : "—"}
                      </td>
                      <td className="row-actions">
                        <button title="редактировать" onClick={() => { setEditing(f.id); setDraft(f.value_raw ?? ""); }}>✎</button>
                        <button title="удалить" onClick={() => del(f)}>🗑</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <FactModal fact={selected} doc={docs.find((d) => d.id === selected.document_id)} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
