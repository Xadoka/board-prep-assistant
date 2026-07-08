import { redirect } from "next/navigation";

export default async function PacketIndex({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/packets/${id}/sources`);
}
