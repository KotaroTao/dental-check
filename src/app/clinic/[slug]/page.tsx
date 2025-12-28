import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { ClinicPage, CTAConfig, WeeklySchedule } from "@/types/clinic";
import { Clock, MapPin, User, Stethoscope, CheckCircle, Bell } from "lucide-react";
import { PhotoCarousel } from "./photo-carousel";
import { FloatingCTA } from "./floating-cta";
import { ClinicCTA } from "./clinic-cta";

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

// 曜日ラベル
const DAY_LABELS = {
  mon: "月",
  tue: "火",
  wed: "水",
  thu: "木",
  fri: "金",
  sat: "土",
  sun: "日",
} as const;

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
  const hasWeeklySchedule = clinicPage.weeklySchedule && Object.keys(clinicPage.weeklySchedule).some(
    k => k !== 'note' && clinicPage.weeklySchedule?.[k as keyof WeeklySchedule]
  );
  const hasAccess = clinicPage.access?.address;
  const hasCTA = ctaConfig.phone || ctaConfig.bookingUrl || ctaConfig.lineUrl || ctaConfig.instagramUrl || ctaConfig.youtubeUrl || ctaConfig.facebookUrl || ctaConfig.tiktokUrl || ctaConfig.threadsUrl;
  const hasTreatments = clinicPage.treatments && clinicPage.treatments.length > 0;
  const hasFacilities = clinicPage.facilities && clinicPage.facilities.length > 0;
  const hasAnnouncements = clinicPage.announcements && clinicPage.announcements.length > 0;

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

      <main className="container mx-auto px-4 py-8 max-w-2xl pb-24">
        {/* お知らせ */}
        {hasAnnouncements && (
          <section className="mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h2 className="text-sm font-bold text-yellow-800 mb-3 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                お知らせ
              </h2>
              <div className="space-y-2">
                {clinicPage.announcements!.slice(0, 3).map((announcement) => (
                  <div
                    key={announcement.id}
                    className={`${announcement.important ? "bg-red-50 border-red-200" : "bg-white"} rounded-lg p-3 border`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {announcement.date}
                      </span>
                      <div>
                        <p className={`text-sm font-medium ${announcement.important ? "text-red-600" : "text-gray-800"}`}>
                          {announcement.title}
                        </p>
                        {announcement.content && (
                          <p className="text-xs text-gray-600 mt-1">{announcement.content}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 医院写真（カルーセル） */}
        {hasPhotos && (
          <section className="mb-8">
            <PhotoCarousel photos={clinicPage.photos!} />
          </section>
        )}

        {/* 診療内容 */}
        {hasTreatments && (
          <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Stethoscope className="w-5 h-5" style={{ color: mainColor }} />
              診療内容
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {clinicPage.treatments!.map((treatment, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 rounded-lg text-center"
                >
                  <p className="font-medium text-sm">{treatment.name}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 設備・特徴 */}
        {hasFacilities && (
          <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" style={{ color: mainColor }} />
              設備・特徴
            </h2>
            <div className="flex flex-wrap gap-2">
              {clinicPage.facilities!.map((facility, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm"
                  style={{ backgroundColor: `${mainColor}15`, color: mainColor }}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {facility.name}
                </span>
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
        {(hasHours || hasWeeklySchedule) && (
          <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" style={{ color: mainColor }} />
              診療時間
            </h2>

            {hasWeeklySchedule ? (
              /* 曜日別テーブル */
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 px-1 text-center w-10"></th>
                      {(Object.keys(DAY_LABELS) as Array<keyof typeof DAY_LABELS>).map((day) => (
                        <th key={day} className="py-2 px-1 text-center">
                          {DAY_LABELS[day]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 px-1 text-gray-600 text-center text-xs">午前</td>
                      {(Object.keys(DAY_LABELS) as Array<keyof typeof DAY_LABELS>).map((day) => {
                        const schedule = clinicPage.weeklySchedule?.[day];
                        if (schedule?.closed) {
                          return <td key={day} className="py-2 px-1 text-center text-gray-400">-</td>;
                        }
                        return (
                          <td key={day} className="py-2 px-1 text-center">
                            {schedule?.morning ? (
                              <span className="text-green-600">○</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-1 text-gray-600 text-center text-xs">午後</td>
                      {(Object.keys(DAY_LABELS) as Array<keyof typeof DAY_LABELS>).map((day) => {
                        const schedule = clinicPage.weeklySchedule?.[day];
                        if (schedule?.closed) {
                          return <td key={day} className="py-2 px-1 text-center text-gray-400">-</td>;
                        }
                        return (
                          <td key={day} className="py-2 px-1 text-center">
                            {schedule?.afternoon ? (
                              <span className="text-green-600">○</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                            {schedule?.note && (
                              <span className="text-xs text-gray-400 block">{schedule.note}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>

                {/* 時間詳細 */}
                <div className="mt-4 text-xs text-gray-600 space-y-1">
                  {(Object.keys(DAY_LABELS) as Array<keyof typeof DAY_LABELS>).map((day) => {
                    const schedule = clinicPage.weeklySchedule?.[day];
                    if (!schedule || schedule.closed) return null;
                    if (!schedule.morning && !schedule.afternoon) return null;
                    return (
                      <p key={day}>
                        <span className="font-medium">{DAY_LABELS[day]}曜:</span>{" "}
                        {schedule.morning && `午前 ${schedule.morning}`}
                        {schedule.morning && schedule.afternoon && " / "}
                        {schedule.afternoon && `午後 ${schedule.afternoon}`}
                      </p>
                    );
                  })}
                </div>

                {clinicPage.weeklySchedule?.note && (
                  <p className="text-xs text-gray-500 mt-3">※{clinicPage.weeklySchedule.note}</p>
                )}
              </div>
            ) : (
              /* 従来形式 */
              <>
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
              </>
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

        {/* CTA（インライン） */}
        {hasCTA && (
          <ClinicCTA ctaConfig={ctaConfig} mainColor={mainColor} clinicId={clinic.id} />
        )}

        {/* コンテンツがない場合 */}
        {!hasPhotos && !hasDirector && !hasHours && !hasWeeklySchedule && !hasAccess && !hasCTA && !hasTreatments && !hasFacilities && !hasAnnouncements && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
            <p>医院情報は現在準備中です</p>
          </div>
        )}
      </main>

      {/* フローティングCTA */}
      {hasCTA && (
        <FloatingCTA ctaConfig={ctaConfig} mainColor={mainColor} clinicId={clinic.id} />
      )}

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
