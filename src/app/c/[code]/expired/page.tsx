import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ExpiredPage } from "@/components/channel/expired-page";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function ChannelExpiredPage({ params }: Props) {
  const { code } = await params;

  // チャンネルを取得
  const channel = await prisma.channel.findUnique({
    where: { code },
    include: { clinic: true },
  });

  if (!channel) {
    notFound();
  }

  return (
    <ExpiredPage
      clinicName={channel.clinic.name}
      logoUrl={channel.clinic.logoUrl}
    />
  );
}

export const dynamic = "force-dynamic";
