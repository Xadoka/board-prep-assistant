export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { documents, packets } from "@/lib/repo";
import { inferSourceType } from "@/lib/parsers";
import { enqueueDocument } from "@/lib/worker";

// GET /api/packets/:id/documents — list documents with status (§7.2)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await documents.byPacket(Number(id)));
}

// POST /api/packets/:id/documents — multipart upload; kicks off async processing.
// Supports several files at once; each is queued independently (§7.2 / §10).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const packetId = Number(id);
  if (!(await packets.get(packetId))) {
    return NextResponse.json({ error: "packet not found" }, { status: 404 });
  }

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "no files" }, { status: 400 });
  }

  const created = [];
  for (const file of files) {
    const buf = Buffer.from(await file.arrayBuffer());
    const storagePath = await storage.save(file.name, buf);
    const sourceType = inferSourceType(file.name);
    const doc = await documents.create(packetId, sourceType, file.name, storagePath);
    if (doc) {
      await packets.linkDocument(packetId, doc.id);
      enqueueDocument(doc.id); // fire-and-forget: parse → chunk → extract
      created.push(doc);
    }
  }

  return NextResponse.json({ documents: created }, { status: 202 });
}