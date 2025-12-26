import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { ClinicPage, CTAConfig } from "@/types/clinic";
import { Phone, Calendar, MessageCircle, Instagram, Clock, MapPin, User } from "lucide-react";

interface ClinicData {
  id: string;
  slug: string;
  name: string;
  phone: string | null;
  logoUrl: string | null;
  mainColor: string;
  clinicPage: ClinicPage;
  ctaConfig: CTAConfig;
}

// Googleマップ埋め込みURLを安全に抽出
function extractGoogleMapsUrl(embedCode: string): string | null {
  // iframeからsrc属性を抽出
  const srcMatch = embedCode.match(/src=["']([^"']+)["']/);
  if (!srcMatch) return null;

  const url = srcMatch[1];
  // GoogleマップのURLかどうかを検証
  if (!url.startsWith("https://www.google.com/maps/embed") &&
      !url.startsWith("https://maps.google.com/")) {
    return null;
  }

  return url;
}

async function getClinic(slug: string): Promise<ClinicData | null> {
  const clinic = await prisma.clinic.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      phone: true,
      logoUrl: true,
      mainColor: true,
      clinicPage: true,
      ctaConfig: true,
    },
  });

  if (!clinic) return null;

  return {
    ...clinic,
    clinicPage: (clinic.clinicPage as ClinicPage) || {},
    ctaConfig: (clinic.ctaConfig as CTAConfig) || {},
  };
}

export default async function ClinicPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const clinic = await getClinic(slug);

  if (!clinic) {
    notFound();
  }

  const { clinicPage, ctaConfig, mainColor } = clinic;
  const hasPhotos = clinicPage.photos && clinicPage.photos.length > 0;
  const hasDirector = clinicPage.director?.name || clinicPage.director?.profile;
  const hasHours = clinicPage.hours?.weekday || clinicPage.hours?.saturday;
  const hasAccess = clinicPage.access?.address;
  const hasCTA = ctaConfig.phone || ctaConfig.bookingUrl || ctaConfig.lineUrl;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header
        className="text-white py-8"
        style={{ backgroundColor: mainColor }}
      >
        <div className="container mx-auto px-4 text-center">
          {clinic.logoUrl && (
            <img
              src={clinic.logoUrl}
              alt={clinic.name}
              className="h-16 mx-auto mb-4 object-contain"
            />
          )}
          <h1 className="text-2xl font-bold">{clinic.name}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* 医院写真 */}
        {hasPhotos && (
          <section className="mb-8">
            <div className="grid gap-4">
              {clinicPage.photos!.map((photo, index) => (
                <div key={index} className="bg-white rounded-xl overflow-hidden shadow-sm">
                  <img
                    src={photo.url}
                    alt={photo.caption || `医院写真 ${index + 1}`}
                    className="w-full h-48 object-cover"
                  />
                  {photo.caption && (
                    <p className="p-3 text-sm text-gray-600 text-center">
                      {photo.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 院長紹介 */}
        {hasDirector && (
          <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" style={{ color: mainColor }} />
              院長紹介
            </h2>
            <div className="flex gap-4">
              {clinicPage.director?.photoUrl && (
                <img
                  src={clinicPage.director.photoUrl}
                  alt={clinicPage.director.name || "院長"}
                  className="w-24 h-24 rounded-full object-cover flex-shrink-0"
                />
              )}
              <div>
                {clinicPage.director?.name && (
                  <p className="font-bold text-lg mb-2">{clinicPage.director.name}</p>
                )}
                {clinicPage.director?.profile && (
                  <p className="text-gray-600 text-sm whitespace-pre-wrap">
                    {clinicPage.director.profile}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 診療時間 */}
        {hasHours && (
          <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" style={{ color: mainColor }} />
              診療時間
            </h2>
            <table className="w-full text-sm">
              <tbody>
                {clinicPage.hours?.weekday && (
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">平日</td>
                    <td className="py-2 text-right">{clinicPage.hours.weekday}</td>
                  </tr>
                )}
                {clinicPage.hours?.saturday && (
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">土曜日</td>
                    <td className="py-2 text-right">{clinicPage.hours.saturday}</td>
                  </tr>
                )}
                {clinicPage.hours?.sunday && (
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">日曜日</td>
                    <td className="py-2 text-right">{clinicPage.hours.sunday}</td>
                  </tr>
                )}
                {clinicPage.hours?.holiday && (
                  <tr className="border-b">
                    <td className="py-2 text-gray-600">祝日</td>
                    <td className="py-2 text-right">{clinicPage.hours.holiday}</td>
                  </tr>
                )}
              </tbody>
            </table>
            {clinicPage.hours?.note && (
              <p className="text-xs text-gray-500 mt-3">{clinicPage.hours.note}</p>
            )}
          </section>
        )}

        {/* アクセス */}
        {hasAccess && (
          <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" style={{ color: mainColor }} />
              アクセス
            </h2>
            <p className="text-gray-800 mb-2">{clinicPage.access?.address}</p>
            {clinicPage.access?.note && (
              <p className="text-sm text-gray-600 mb-4">{clinicPage.access.note}</p>
            )}
            {clinicPage.access?.mapEmbed && (() => {
              const mapUrl = extractGoogleMapsUrl(clinicPage.access.mapEmbed);
              return mapUrl ? (
                <iframe
                  src={mapUrl}
                  className="w-full aspect-video rounded-lg"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : null;
            })()}
          </section>
        )}

        {/* CTA */}
        {hasCTA && (
          <section className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4 text-center">ご予約・お問い合わせ</h2>

            {ctaConfig.directorMessage && (
              <p className="text-gray-600 text-sm mb-4 text-center">
                {ctaConfig.directorMessage}
              </p>
            )}

            <div className="space-y-3">
              {ctaConfig.phone && (
                <a
                  href={`tel:${ctaConfig.phone}`}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-lg text-white font-medium"
                  style={{ backgroundColor: mainColor }}
                >
                  <Phone className="w-5 h-5" />
                  電話予約 {ctaConfig.phone}
                </a>
              )}

              {ctaConfig.bookingUrl && (
                <a
                  href={ctaConfig.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border-2 font-medium"
                  style={{ borderColor: mainColor, color: mainColor }}
                >
                  <Calendar className="w-5 h-5" />
                  WEB予約
                </a>
              )}

              {ctaConfig.lineUrl && (
                <a
                  href={ctaConfig.lineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-[#06C755] text-white font-medium"
                >
                  <MessageCircle className="w-5 h-5" />
                  LINEで予約
                </a>
              )}

              {ctaConfig.instagramUrl && (
                <a
                  href={ctaConfig.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white font-medium"
                >
                  <Instagram className="w-5 h-5" />
                  Instagram
                </a>
              )}
            </div>
          </section>
        )}

        {/* コンテンツがない場合 */}
        {!hasPhotos && !hasDirector && !hasHours && !hasAccess && !hasCTA && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
            <p>医院情報は現在準備中です</p>
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="bg-gray-100 py-6 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <p>&copy; {clinic.name}</p>
        </div>
      </footer>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const clinic = await getClinic(slug);

  if (!clinic) {
    return {
      title: "医院が見つかりません",
    };
  }

  return {
    title: `${clinic.name} | 医院紹介`,
    description: clinic.clinicPage.director?.profile || `${clinic.name}の医院紹介ページです`,
  };
}

// 静的生成を無効化（動的ルート）
export const dynamic = "force-dynamic";
