import { NextResponse } from "next/server";

// GET /api/packets/:id/export?format=docx|pdf — Срез 6 (v1.1).
// Stub: export to DOCX/PDF with clickable source links is planned but not built.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = new URL(req.url).searchParams.get("format") ?? "docx";
  return NextResponse.json(
    {
      error: "not_implemented",
      message: `Export to ${format} is planned for Срез 6 (v1.1). ` +
        `Use the docx skill / a PDF renderer to build from packets.summary_md + facts.`,
      packet_id: Number(id),
    },
    { status: 501 }
  );
}
