import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { checkSubscription } from "@/lib/subscription";
import { ProfileForm } from "@/components/common/profile-form";
import { ExpiredPage } from "@/components/channel/expired-page";
import type { Clinic } from "@/types/clinic";

interface Props {
  params: Promise<{
    code: string;
  }>;
}

interface ChannelData {
  id: string;
  code: string;
  name: string;
  channelType: string;
  diagnosisTypeSlug: string | null;
  redirectUrl: string | null;
  expiresAt: Date | null;
}

interface PageData {
  channel: ChannelData;
  clinic: Clinic;
  isExpired: boolean;
}

async function getChannelAndClinic(code: string): Promise<PageData | null> {
  // チャンネルを取得
  const channel = await prisma.channel.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      name: true,
      channelType: true,
      diagnosisTypeSlug: true,
      redirectUrl: true,
      expiresAt: true,
      isActive: true,
      clinicId: true,
    },
  });

  if (!channel || !channel.isActive) {
    return null;
  }

  // チャンネルタイプの検証
  if (channel.channelType === "diagnosis" && !channel.diagnosisTypeSlug) {
    return null;
  }
  if (channel.channelType === "link" && !channel.redirectUrl) {
    return null;
  }

  // 医院情報を取得
  const clinic = await prisma.clinic.findUnique({
    where: { id: channel.clinicId },
  });

  if (!clinic) {
    return null;
  }

  // サブスクリプション状態をチェック
  const subscriptionCheck = await checkSubscription(clinic.id);
  if (!subscriptionCheck.isActive) {
    return null;
  }

  // 有効期限チェック
  const isExpired = channel.expiresAt ? new Date() > new Date(channel.expiresAt) : false;

  return {
    channel: {
      id: channel.id,
      code: channel.code,
      name: channel.name,
      channelType: channel.channelType,
      diagnosisTypeSlug: channel.diagnosisTypeSlug,
      redirectUrl: channel.redirectUrl,
      expiresAt: channel.expiresAt,
    },
    clinic: clinic as Clinic,
    isExpired,
  };
}

export default async function ProfilePage({ params }: Props) {
  const { code } = await params;

  // チャンネルと医院情報を取得
  const data = await getChannelAndClinic(code);
  if (!data) {
    notFound();
  }

  const { channel, clinic, isExpired } = data;

  // 有効期限切れの場合
  if (isExpired) {
    return <ExpiredPage clinicName={clinic.name} logoUrl={clinic.logoUrl} />;
  }

  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: clinic.mainColor + "10" }}
    >
      {/* 医院ヘッダー */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            {clinic.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clinic.logoUrl}
                alt={clinic.name}
                className="h-8 w-auto"
              />
            )}
            <span className="font-medium text-gray-800">{clinic.name}</span>
          </div>
        </div>
      </header>

      {/* プロファイル入力フォーム（診断あり・なし共通） */}
      <div className="container mx-auto px-4 py-8 max-w-md">
        <ProfileForm
          channelId={channel.id}
          channelName={channel.name}
          channelType={channel.channelType as "diagnosis" | "link"}
          mainColor={clinic.mainColor}
        />
      </div>
    </main>
  );
}

// 静的生成を無効化（動的ルート）
export const dynamic = "force-dynamic";
