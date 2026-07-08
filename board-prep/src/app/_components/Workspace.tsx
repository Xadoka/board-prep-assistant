"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { API } from "../_lib/api";

// Sidebar shell for a single packet workspace (§7): nav + theme toggle + title.
export default function Workspace({
  packetId,
  children,
}: {
  packetId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [title, setTitle] = useState("Подготовка");
  const [docCount, setDocCount] = useState<number | null>(null);
  const [factCount, setFactCount] = useState<number | null>(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  useEffect(() => {
    API.packet(packetId)
      .then((d) => {
        setTitle(d.packet.title);
        setDocCount(d.documents.length);
        setFactCount(d.facts.length);
      })
      .catch(() => {});
  }, [packetId, pathname]);

  function toggleTheme() {
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("bpa-theme", next);
    } catch {}
    setDark(!dark);
  }

  const base = `/packets/${packetId}`;
  const link = (href: string) =>
    "nav-link" + (pathname === href ? " active" : "");

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="dot">B</div>
          <Link href="/" className="name">Board Prep Assistant</Link>
        </div>
        <div className="muted" style={{ padding: "0 6px 12px", fontSize: 12.5 }}>{title}</div>
        <nav className="nav">
          <Link href={`${base}/sources`} className={link(`${base}/sources`)}>
            <span className="ico">▢</span> Источники
            {docCount != null && <span className="badge">{docCount}</span>}
          </Link>
          <Link href={`${base}/facts`} className={link(`${base}/facts`)}>
            <span className="ico">≡</span> Ревью фактов
            {factCount != null && <span className="badge">{factCount}</span>}
          </Link>
          <Link href={`${base}/packet`} className={link(`${base}/packet`)}>
            <span className="ico">◈</span> Board packet
          </Link>
        </nav>
        <div className="spacer" />
        <button className="theme-toggle" onClick={toggleTheme}>
          <span>{dark ? "◑" : "◐"}</span> {dark ? "Светлая тема" : "Тёмная тема"}
        </button>
      </aside>
      {children}
    </div>
  );
}
