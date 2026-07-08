import Workspace from "../../_components/Workspace";

export default async function PacketLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Workspace packetId={id}>{children}</Workspace>;
}
