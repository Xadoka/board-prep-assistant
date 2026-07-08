import { NextResponse } from "next/server";
import { synthesizePacket } from "@/lib/synthesize";

// POST /api/packets/:id/synthesize — run synthesis from verified facts (§7.3 → §7.4)
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const result = await synthesizePacket(Number(id));
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "synthesis failed" },
      { status: 400 }
    );
  }
}
