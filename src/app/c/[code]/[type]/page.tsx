import { notFound } from "next/navigation";
import { diagnosisTypes } from "@/data/diagnosis-types";
import { DiagnosisFlow } from "@/components/diagnosis/diagnosis-flow";
import { prisma } from "@/lib/prisma";
import { checkSubscription } from "@/lib/subscription";
import type { Channel, Clinic } from "@/types/clinic";
import { ExpiredPage } from "@/components/channel/expired-page";

interface Props {
  params: Promise<{
    code: string;
    type: string;
  }>;
}

interface ChannelResult {
  channel: Channel;
  clinic: Clinic;
  isExpired: boolean;
}

async function getChannelAndClinic(code: string): Promise<ChannelResult | null> {
  // チャンネルを取得
  const channel = (await prisma.channel.findUnique({
    where: { code },
  })) as (Channel & { expiresAt: Date | null }) | null;

  if (!channel || !channel.isActive) {
    return null;
  }

  // 医院情報を取得
  const clinic = (await prisma.clinic.findUnique({
    where: { id: channel.clinicId },
  })) as Clinic | null;

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

  return { channel, clinic, isExpired };
}

export default async function ClinicDiagnosisPage({ params }: Props) {
  const { code, type } = await params;

  // 診断タイプを取得
  const diagnosis = diagnosisTypes[type];
  if (!diagnosis) {
    notFound();
  }

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

      {/* 診断フロー */}
      <DiagnosisFlow
        diagnosis={diagnosis}
        isDemo={false}
        clinicSlug={clinic.slug}
        ctaConfig={clinic.ctaConfig}
        clinicName={clinic.name}
        mainColor={clinic.mainColor}
        channelId={channel.id}
      />

      {/* アクセストラッキング用の非表示コンポーネント */}
      <AccessTracker channelId={channel.id} diagnosisType={type} />
    </main>
  );
}

// アクセストラッキングコンポーネント
function AccessTracker({
  channelId,
  diagnosisType,
}: {
  channelId: string;
  diagnosisType: string;
}) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          fetch('/api/track/access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channelId: '${channelId}',
              diagnosisType: '${diagnosisType}',
              eventType: 'page_view'
            })
          }).catch(() => {});
        `,
      }}
    />
  );
}

// 静的生成を無効化（動的ルート）
export const dynamic = "force-dynamic";
