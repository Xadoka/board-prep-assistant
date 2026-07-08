export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { facts } from "@/lib/repo";

// PATCH /api/facts/:id — edit a doubtful fact before synthesis (§7.3)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  await facts.update(Number(id), {
    value_raw: body.value_raw,
    value_num: typeof body.value_num === "number" ? body.value_num : undefined,
    unit: body.unit,
    period: body.period,
  });
  return NextResponse.json({ ok: true });
}

// DELETE /api/facts/:id — remove a fact before synthesis (§7.3)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await facts.remove(Number(id));
  return NextResponse.json({ ok: true });
}