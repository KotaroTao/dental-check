import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 有効なCSSカラーかチェック（hex形式のみ許可）
function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

// 安全なカラー値を取得
function getSafeColor(color: string): string {
  return isValidHexColor(color) ? color : "#2563eb";
}

// 埋め込みコードを取得
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const clinic = await prisma.clinic.findUnique({
      where: { id: session.clinicId },
      select: {
        id: true,
        slug: true,
        name: true,
        mainColor: true,
      },
    });

    if (!clinic) {
      return NextResponse.json({ error: "医院が見つかりません" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // 診断タイプ別の埋め込みコードを生成
    const embedCodes = [
      {
        type: "oral-age",
        name: "お口年齢診断",
        description: "お口の健康状態を診断し、年齢との比較を行います",
        embedUrl: `${appUrl}/embed/${clinic.slug}/oral-age`,
        directUrl: `${appUrl}/clinic/${clinic.slug}`,
        iframeCode: generateIframeCode(`${appUrl}/embed/${clinic.slug}/oral-age`),
        scriptCode: generateScriptCode(clinic.slug, "oral-age"),
        buttonCode: generateButtonCode(`${appUrl}/embed/${clinic.slug}/oral-age`, getSafeColor(clinic.mainColor), "お口年齢診断を受ける"),
      },
      {
        type: "child-orthodontics",
        name: "子供の矯正診断",
        description: "お子様の矯正治療の必要性を診断します",
        embedUrl: `${appUrl}/embed/${clinic.slug}/child-orthodontics`,
        directUrl: `${appUrl}/clinic/${clinic.slug}`,
        iframeCode: generateIframeCode(`${appUrl}/embed/${clinic.slug}/child-orthodontics`),
        scriptCode: generateScriptCode(clinic.slug, "child-orthodontics"),
        buttonCode: generateButtonCode(`${appUrl}/embed/${clinic.slug}/child-orthodontics`, getSafeColor(clinic.mainColor), "子供の矯正診断を受ける"),
      },
    ];

    return NextResponse.json({
      clinic: {
        id: clinic.id,
        slug: clinic.slug,
        name: clinic.name,
      },
      embedCodes,
    });
  } catch (error) {
    console.error("Get embed codes error:", error);
    return NextResponse.json(
      { error: "埋め込みコードの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// iframe埋め込みコードを生成
function generateIframeCode(url: string): string {
  return `<iframe
  src="${url}"
  width="100%"
  height="700"
  frameborder="0"
  style="border: none; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"
  allow="clipboard-write"
  loading="lazy"
  title="歯科診断ツール"
></iframe>`;
}

// JavaScriptウィジェット埋め込みコードを生成
function generateScriptCode(clinicSlug: string, diagnosisType: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `<div id="dental-diagnosis-widget" data-clinic="${clinicSlug}" data-type="${diagnosisType}"></div>
<script src="${appUrl}/embed/widget.js" async></script>`;
}

// ボタン埋め込みコードを生成
function generateButtonCode(url: string, mainColor: string, buttonText: string): string {
  return `<a
  href="${url}"
  target="_blank"
  rel="noopener noreferrer"
  style="display: inline-block; padding: 12px 24px; background-color: ${mainColor}; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: opacity 0.2s;"
  onmouseover="this.style.opacity='0.9'"
  onmouseout="this.style.opacity='1'"
>
  ${buttonText}
</a>`;
}
