"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API, toast, type Packet } from "./_lib/api";

// §7.1 Dashboard — list preparations, create a new one.
export default function Dashboard() {
  const router = useRouter();
  const [packets, setPackets] = useState<Packet[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    API.listPackets().then(setPackets).catch((e) => setError(e.message));
  }, []);

  async function create() {
    const title = window.prompt(
      "Название подготовки",
      `Совет директоров · ${new Date().toLocaleDateString("ru-RU")}`
    );
    if (!title) return;
    setCreating(true);
    try {
      const { id } = await API.createPacket(title);
      router.push(`/packets/${id}/sources`);
    } catch (e) {
      toast((e as Error).message);
      setCreating(false);
    }
  }

  return (
    <div className="main">
      <div className="topbar">
        <div>
          <h1>Дашборд</h1>
          <div className="sub">Подготовки к совету директоров</div>
        </div>
        <div className="right">
          <button className="btn" onClick={create} disabled={creating}>
            {creating ? <span className="spinner" /> : "+"} Новая подготовка
          </button>
        </div>
      </div>
      <div className="content">
        {error && <p className="pill err">{error}</p>}
        {!packets && !error && <p className="muted">Загрузка…</p>}
        {packets && packets.length === 0 && (
          <div className="empty">
            <div style={{ fontSize: 34, marginBottom: 8 }}>▤</div>
            <div style={{ fontWeight: 600, color: "var(--text)" }}>Пока нет подготовок</div>
            <div style={{ margin: "6px 0 18px" }}>Создайте первую и загрузите источники.</div>
            <button className="btn" onClick={create}>+ Новая подготовка</button>
          </div>
        )}
        {packets && packets.length > 0 && (
          <div className="grid">
            {packets.map((p) => (
              <Link key={p.id} href={`/packets/${p.id}/sources`} className="card packet-card">
                <h3>{p.title}</h3>
                <div className="meta">
                  {new Date(p.created_at).toLocaleString("ru-RU")}
                </div>
                <div className="foot">
                  <span className={`pill ${p.status === "ready" ? "ok" : "info"}`}>
                    <span className="d" />
                    {p.status === "ready" ? "packet готов" : "черновик"}
                  </span>
                </div>
              </Link>
            ))}
            <button
              className="card packet-card"
              style={{ borderStyle: "dashed", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-faint)", minHeight: 120 }}
              onClick={create}
            >
              + новая подготовка
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
