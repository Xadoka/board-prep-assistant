"use client";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API, toast, type Fact, type PacketDetail } from "../../../_lib/api";
import FactModal from "../../../_components/FactModal";

// §7.4 Board packet — executive summary, metrics, discrepancies, questions.
// Every number is clickable → its source quote (§4, §10).
export default function PacketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<PacketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Fact | null>(null);

  useEffect(() => {
    API.packet(id).then(setData).catch((e) => toast((e as Error).message)).finally(() => setLoading(false));
  }, [id]);

  const factsById = useMemo(() => {
    const m = new Map<number, Fact>();
    data?.facts.forEach((f) => m.set(f.id, f));
    return m;
  }, [data]);

  const cite = useCallback(
    (ids: number[]) =>
      ids.map((n) => {
        const f = factsById.get(n);
        return (
          <button key={n} className="cite" onClick={() => f && setSelected(f)} title={f?.quote ?? ""}>
            F{n}
          </button>
        );
      }),
    [factsById]
  );

  // Renders **bold** and [n] citation tokens inside summary_md.
  const renderInline = useCallback(
    (text: string) => {
      const parts = text.split(/(\*\*[^*]+\*\*|\[\d+\])/g).filter(Boolean);
      return parts.map((p, i) => {
        const bold = p.match(/^\*\*([^*]+)\*\*$/);
        if (bold) return <strong key={i}>{bold[1]}</strong>;
        const c = p.match(/^\[(\d+)\]$/);
        if (c) {
          const f = factsById.get(Number(c[1]));
          return (
            <button key={i} className="cite" onClick={() => f && setSelected(f)} title={f?.quote ?? ""}>
              F{c[1]}
            </button>
          );
        }
        return <Fragment key={i}>{p}</Fragment>;
      });
    },
    [factsById]
  );

  async function exportAs(format: "docx" | "pdf") {
    try {
      const r = await fetch(API.exportUrl(id, format));
      const body = await r.json();
      toast(body.message || body.error || `Экспорт ${format}`);
    } catch (e) {
      toast((e as Error).message);
    }
  }

  if (loading) {
    return <Main title="Board packet"><p className="muted">Загрузка…</p></Main>;
  }
  const packet = data?.packet;

  if (!packet?.summary_md) {
    return (
      <Main title="Board packet">
        <div className="empty">
          <div style={{ fontSize: 34, marginBottom: 8 }}>◈</div>
          <div style={{ fontWeight: 600, color: "var(--text)" }}>Packet ещё не синтезирован</div>
          <div style={{ margin: "6px 0 18px" }}>Сначала проверьте факты, затем запустите синтез.</div>
          <button className="btn" onClick={() => router.push(`/packets/${id}/facts`)}>
            Перейти к ревью фактов
          </button>
        </div>
      </Main>
    );
  }

  const paragraphs = packet.summary_md.split(/\n{2,}/).filter((p) => p.trim());
  const discrepancies = data!.discrepancies;
  const questions = packet.questions_json ?? [];

  // Metrics table derived from verified facts (unique metric + period).
  const seen = new Set<string>();
  const metricRows = data!.facts.filter((f) => {
    if (f.value_raw == null) return false;
    const key = `${f.metric_name}|${f.period ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <Main
      title="Board packet"
      right={
        <>
          <button className="btn ghost" onClick={() => exportAs("docx")}>↓ DOCX</button>
          <button className="btn ghost" onClick={() => exportAs("pdf")}>↓ PDF</button>
        </>
      }
    >
      <div className="packet-wrap">
        <div className="card">
          <div className="card-head"><h3>Executive summary</h3><span className="pill info" style={{ marginLeft: "auto" }}>≤250 слов</span></div>
          <div className="card-pad summary-md">
            {paragraphs.map((p, i) => <p key={i}>{renderInline(p.replace(/\n/g, " "))}</p>)}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Ключевые метрики</h3></div>
          <table>
            <thead><tr><th>Метрика</th><th>Значение</th><th>Период</th><th>Источник</th></tr></thead>
            <tbody>
              {metricRows.map((f) => (
                <tr key={f.id}>
                  <td className="metric-name">{f.metric_name}</td>
                  <td>{f.value_raw}</td>
                  <td>{f.period ?? "—"}</td>
                  <td>{cite([f.id])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-head"><h3>Расхождения в источниках</h3></div>
          <div className="card-pad">
            {discrepancies.length === 0 && <div className="muted">Расхождений не найдено.</div>}
            {discrepancies.map((d, i) => (
              <div className="disc-item" key={i}>
                <div className="dm">⚠ {d.canonical_name} · расхождение между источниками</div>
                <div>
                  {d.source_fact_ids.map((fid, j) => {
                    const f = factsById.get(fid);
                    return (
                      <span key={fid}>
                        {j > 0 && " vs "}
                        <b>{f?.value_raw ?? "?"}</b> {cite([fid])}
                      </span>
                    );
                  })}
                </div>
                {d.notes && <div className="muted" style={{ marginTop: 4, fontSize: 12.5 }}>{d.notes}</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Вопросы для обсуждения</h3><span className="pill" style={{ marginLeft: "auto" }}>{questions.length}</span></div>
          <div className="card-pad" style={{ paddingTop: 0 }}>
            {questions.length === 0 && <p className="muted">Вопросы не сгенерированы.</p>}
            {questions.map((q, i) => (
              <div className="q-item" key={i}>
                <div className="qt">{q.text}</div>
                <div className="qr">
                  {q.rationale}
                  {q.based_on_fact_ids && q.based_on_fact_ids.length > 0 && <> · {cite(q.based_on_fact_ids)}</>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="muted" style={{ marginTop: 16, fontSize: 12.5 }}>
        Каждая цифра кликабельна и ведёт к цитате и документу. Без источника цифра не показывается (§10 PRD).
      </p>

      {selected && (
        <FactModal fact={selected} doc={data!.documents.find((d) => d.id === selected.document_id)} onClose={() => setSelected(null)} />
      )}
    </Main>
  );
}

function Main({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="main">
      <div className="topbar">
        <div>
          <h1>{title}</h1>
          <div className="sub">Итоговый материал для совета</div>
        </div>
        {right && <div className="right">{right}</div>}
      </div>
      <div className="content">{children}</div>
    </div>
  );
}
