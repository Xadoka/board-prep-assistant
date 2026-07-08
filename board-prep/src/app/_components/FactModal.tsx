"use client";
import type { Fact, DocumentRow } from "../_lib/api";

// Citation detail: shows the exact quote + source document for a fact (§4).
export default function FactModal({
  fact,
  doc,
  onClose,
}: {
  fact: Fact;
  doc?: DocumentRow;
  onClose: () => void;
}) {
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="mh">
          <h3>Источник · F{fact.id}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="mb">
          <div className="kv"><span className="k">метрика</span><span>{fact.metric_name}</span></div>
          <div className="kv"><span className="k">значение</span><span>{fact.value_raw ?? "—"}{fact.period ? ` · ${fact.period}` : ""}</span></div>
          <div className="kv"><span className="k">документ</span><span>{doc?.filename ?? `#${fact.document_id}`}</span></div>
          {fact.confidence != null && (
            <div className="kv"><span className="k">уверенность</span><span>{fact.confidence.toFixed(2)}</span></div>
          )}
          <div className="quote-block">«{fact.quote ?? "—"}»</div>
          <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
            Каждая цифра прослеживается до дословной цитаты в источнике (§4 PRD).
          </p>
        </div>
      </div>
    </div>
  );
}
