import { NextResponse } from "next/server";
import { packets, documents, facts } from "@/lib/repo";
import { reconcile } from "@/lib/reconcile";

// GET /api/packets/:id — packet detail with documents, facts, and discrepancies.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const packetId = Number(id);
  const packet = await packets.get(packetId);
  if (!packet) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [docs, allFacts] = await Promise.all([
    documents.byPacket(packetId),
    facts.byPacket(packetId),
  ]);
  const reconciled = reconcile(allFacts);

  return NextResponse.json({
    packet,
    documents: docs,
    facts: allFacts,
    discrepancies: reconciled.filter((m) => m.discrepancy),
  });
}
