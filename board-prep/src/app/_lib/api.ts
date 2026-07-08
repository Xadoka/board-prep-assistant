// Browser-side API client + shared types for the React screens.

export interface Packet {
  id: number;
  title: string;
  created_at: string;
  summary_md: string | null;
  questions_json: Question[];
  status: string;
}
export interface Question {
  text: string;
  rationale?: string;
  based_on_fact_ids?: number[];
}
export interface DocumentRow {
  id: number;
  source_type: "report" | "transcript" | "email";
  filename: string;
  status: "uploaded" | "parsing" | "parsed" | "extracted" | "failed";
  uploaded_at: string;
  meta_json: {
    preview?: string;
    chunk_count?: number;
    fact_count?: number;
    error?: string;
    [k: string]: unknown;
  };
}
export interface Fact {
  id: number;
  document_id: number;
  chunk_id: number | null;
  metric_name: string;
  value_raw: string | null;
  value_num: number | null;
  unit: string | null;
  period: string | null;
  quote: string | null;
  confidence: number | null;
}
export interface Discrepancy {
  canonical_name: string;
  period: string | null;
  value_num: number | null;
  unit: string | null;
  source_fact_ids: number[];
  discrepancy: boolean;
  notes: string | null;
}
export interface PacketDetail {
  packet: Packet;
  documents: DocumentRow[];
  facts: Fact[];
  discrepancies: Discrepancy[];
}

async function req<T>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, opts);
  if (!r.ok) {
    let msg = r.statusText;
    try {
      const body = await r.json();
      msg = body.error || body.message || msg;
    } catch {}
    throw new Error(msg);
  }
  return r.json() as Promise<T>;
}

export const API = {
  listPackets: () => req<Packet[]>("/api/packets"),
  createPacket: (title: string) =>
    req<{ id: number }>("/api/packets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    }),
  packet: (id: number | string) => req<PacketDetail>(`/api/packets/${id}`),
  documents: (id: number | string) => req<DocumentRow[]>(`/api/packets/${id}/documents`),
  upload: (id: number | string, files: FileList | File[]) => {
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    return req<{ documents: DocumentRow[] }>(`/api/packets/${id}/documents`, {
      method: "POST",
      body: fd,
    });
  },
  document: (id: number) => req<DocumentRow>(`/api/documents/${id}`),
  updateFact: (id: number, patch: Partial<Fact>) =>
    req(`/api/facts/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }),
  deleteFact: (id: number) => req(`/api/facts/${id}`, { method: "DELETE" }),
  synthesize: (id: number | string) =>
    req(`/api/packets/${id}/synthesize`, { method: "POST" }),
  exportUrl: (id: number | string, format: "docx" | "pdf") =>
    `/api/packets/${id}/export?format=${format}`,
};

export function toast(msg: string) {
  window.dispatchEvent(new CustomEvent("bpa-toast", { detail: msg }));
}

export const DOC_ICON: Record<DocumentRow["source_type"], string> = {
  report: "▤",
  transcript: "◎",
  email: "✉",
};
export const DOC_LABEL: Record<DocumentRow["source_type"], string> = {
  report: "отчёт",
  transcript: "транскрипт",
  email: "почта",
};
