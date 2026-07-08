import { NextResponse } from "next/server";
import { packets } from "@/lib/repo";

// GET /api/packets — list preparations (§7.1 Dashboard)
export async function GET() {
  return NextResponse.json(await packets.list());
}

// POST /api/packets — create a new preparation
export async function POST(req: Request) {
  const { title } = await req.json();
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  const created = await packets.create(title);
  return NextResponse.json(created, { status: 201 });
}
