/**
 * CTAタイプの定義と表示名
 *
 * CTA（Call to Action）ボタンの種類と日本語表示名を一元管理する。
 * ダッシュボード・共有ページ・API全箇所でこのファイルからimportして使う。
 */

/** CTAタイプ → 日本語表示名 */
export const CTA_TYPE_NAMES: Record<string, string> = {
  booking: "予約",
  phone: "電話",
  line: "LINE",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  tiktok: "TikTok",
  threads: "Threads",
  x: "X",
  google_maps: "マップ",
  clinic_page: "医院ページ",
  clinic_homepage: "ホームページ",
  direct_link: "直リンク",
  website: "ウェブサイト",
  email: "メール",
  other: "その他",
};

/** CTA表示名を取得（不明なタイプはそのまま返す） */
export function getCtaTypeName(ctaType: string): string {
  // カスタムCTAの場合は「カスタム」と表示
  if (ctaType.startsWith("custom_")) return "カスタム";
  return CTA_TYPE_NAMES[ctaType] || ctaType;
}
