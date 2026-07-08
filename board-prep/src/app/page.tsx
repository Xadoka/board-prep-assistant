// Placeholder home page. The UI (§7 screens) is prototyped statically in the
// repo root (../index.html, published to GitHub Pages). Wiring these API routes
// into React screens is the next step; for now this page documents the endpoints.

export default function Home() {
  const endpoints = [
    ["GET", "/api/packets", "list preparations"],
    ["POST", "/api/packets", "create a preparation"],
    ["GET", "/api/packets/:id", "packet detail (docs, facts, discrepancies)"],
    ["POST", "/api/packets/:id/documents", "upload files (multipart) → async processing"],
    ["POST", "/api/packets/:id/synthesize", "synthesize packet from verified facts"],
    ["GET", "/api/packets/:id/export?format=docx|pdf", "export (Срез 6 — stub)"],
    ["GET", "/api/documents/:id", "document status + preview"],
    ["GET", "/api/documents/:id/facts", "facts for a document"],
    ["PATCH|DELETE", "/api/facts/:id", "edit / delete a fact before synthesis"],
  ];
  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 760, margin: "40px auto", padding: "0 20px" }}>
      <h1>Board Prep Assistant — API</h1>
      <p>Backend skeleton per PRD §5–§11. See <code>README.md</code> to run it.</p>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
        <tbody>
          {endpoints.map(([m, path, desc]) => (
            <tr key={path + m} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "6px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>{m}</td>
              <td style={{ padding: "6px 10px", fontFamily: "monospace" }}>{path}</td>
              <td style={{ padding: "6px 10px", color: "#666" }}>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
