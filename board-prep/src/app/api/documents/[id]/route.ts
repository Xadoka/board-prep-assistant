import { NextResponse } from "next/server";
import { documents } from "@/lib/repo";

// GET /api/documents/:id — status + parsed-text preview (§7.2)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await documents.get(Number(id));
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(doc);
}
