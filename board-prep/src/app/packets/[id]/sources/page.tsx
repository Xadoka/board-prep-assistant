"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API, toast, DOC_ICON, DOC_LABEL, type DocumentRow } from "../../../_lib/api";

const PENDING: DocumentRow["status"][] = ["uploaded", "parsing", "parsed"];

// §7.2 Источники — upload, statuses (with live polling), preview.
export default function SourcesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [over, setOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<DocumentRow | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      setDocs(await API.documents(id));
    } catch (e) {
      toast((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll while any document is still processing (§7.2 progress indicator).
  useEffect(() => {
    const pending = docs.some((d) => PENDING.includes(d.status));
    if (!pending) return;
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [docs, refresh]);

  async function upload(files: FileList | File[]) {
    if (!files || (files as FileList).length === 0) return;
    setUploading(true);
    try {
      await API.upload(id, files);
      await refresh();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="main">
      <div className="topbar">
        <div>
          <h1>Источники</h1>
          <div className="sub">Загрузка и обработка документов</div>
        </div>
        <div className="right">
          <button className="btn ghost" onClick={() => router.push(`/packets/${id}/facts`)}>
            К ревью фактов →
          </button>
        </div>
      </div>
      <div className="content">
        <div
          className={`drop${over ? " over" : ""}`}
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files); }}
        >
          <div className="big">{uploading ? <span className="spinner" /> : "⇪"}</div>
          <div>перетащите файлы сюда или нажмите, чтобы выбрать</div>
          <div className="muted" style={{ marginTop: 4 }}>PDF, DOCX, XLSX, .txt транскрипты, .eml</div>
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            onChange={(e) => e.target.files && upload(e.target.files)}
          />
        </div>

        <div className="doc-list">
          {docs.map((d) => (
            <div className="doc" key={d.id}>
              <div className="ficon">{DOC_ICON[d.source_type]}</div>
              <div className="info">
                <div className="fn">{d.filename}</div>
                <div className="sub">
                  {DOC_LABEL[d.source_type]}
                  {d.meta_json.chunk_count != null && ` · ${d.meta_json.chunk_count} чанков`}
                  {d.meta_json.fact_count != null && ` · ${d.meta_json.fact_count} фактов`}
                  {d.status === "failed" && d.meta_json.error && ` · ${d.meta_json.error}`}
                </div>
              </div>
              <div className="actions">
                {d.status === "extracted" && (
                  <button className="btn ghost sm" onClick={() => setPreview(d)}>превью</button>
                )}
                <StatusPill status={d.status} />
              </div>
            </div>
          ))}
        </div>
        {docs.length > 0 && (
          <p className="muted" style={{ marginTop: 16, fontSize: 12.5 }}>
            Битый файл получает статус «ошибка» и не блокирует обработку остальных источников (§10 PRD).
          </p>
        )}
      </div>

      {preview && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setPreview(null)}>
          <div className="modal">
            <div className="mh">
              <h3>Превью · {preview.filename}</h3>
              <button onClick={() => setPreview(null)}>✕</button>
            </div>
            <div className="mb">
              <div className="quote-block" style={{ whiteSpace: "pre-wrap", maxHeight: 360, overflow: "auto" }}>
                {preview.meta_json.preview || "—"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: DocumentRow["status"] }) {
  if (status === "extracted") return <span className="pill ok"><span className="d" />факты извлечены</span>;
  if (status === "failed") return <span className="pill err"><span className="d" />ошибка</span>;
  if (PENDING.includes(status)) {
    return (
      <span className="pill info" title={status}>
        <span className="spinner" /> обработка
      </span>
    );
  }
  return <span className="pill"><span className="d" />{status}</span>;
}
