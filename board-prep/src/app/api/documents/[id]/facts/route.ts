import { NextResponse } from "next/server";
import { facts } from "@/lib/repo";

// GET /api/documents/:id/facts — facts extracted from one document (§7.3)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await facts.byDocument(Number(id)));
}
