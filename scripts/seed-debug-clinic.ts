import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ランダムヘルパー
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomDate(daysAgo: number): Date {
  const now = Date.now();
  const past = now - daysAgo * 24 * 60 * 60 * 1000;
  return new Date(past + Math.random() * (now - past));
}

// 地域データ
const REGIONS = [
  { region: "東京都", city: "渋谷区", town: "神南一丁目", lat: 35.66, lng: 139.70 },
  { region: "東京都", city: "新宿区", town: "西新宿二丁目", lat: 35.69, lng: 139.69 },
  { region: "東京都", city: "港区", town: "六本木三丁目", lat: 35.66, lng: 139.73 },
  { region: "東京都", city: "世田谷区", town: "三軒茶屋二丁目", lat: 35.64, lng: 139.67 },
  { region: "東京都", city: "目黒区", town: "自由が丘一丁目", lat: 35.61, lng: 139.67 },
  { region: "神奈川県", city: "横浜市中区", town: "山下町", lat: 35.44, lng: 139.65 },
  { region: "神奈川県", city: "川崎市中原区", town: "小杉町", lat: 35.57, lng: 139.66 },
  { region: "埼玉県", city: "さいたま市大宮区", town: "桜木町一丁目", lat: 35.91, lng: 139.63 },
  { region: "千葉県", city: "千葉市中央区", town: "中央一丁目", lat: 35.61, lng: 140.12 },
  { region: "大阪府", city: "大阪市北区", town: "梅田一丁目", lat: 34.70, lng: 135.50 },
];

const GENDERS = ["male", "female", "other"];
const RESULT_CATEGORIES = ["健康", "やや注意", "要注意", "要受診"];
const CTA_TYPES = ["booking", "phone", "line", "clinic_page", "clinic_homepage"];
const DIAGNOSIS_SLUGS = ["oral-age", "child-orthodontics", "periodontal-risk", "cavity-risk", "whitening-check"];

async function main() {
  console.log("🏥 デバッグクリニックの作成を開始...\n");

  // 1. 医院作成
  const passwordHash = await bcrypt.hash("debug1234", 12);

  const clinic = await prisma.clinic.upsert({
    where: { email: "debug@example.com" },
    update: {},
    create: {
      slug: "debug-clinic",
      name: "デバッグクリニック",
      email: "debug@example.com",
      passwordHash,
      phone: "03-0000-0000",
      mainColor: "#10b981",
      status: "active",
      ctaConfig: JSON.stringify({
        booking: { enabled: true, url: "https://example.com/booking", label: "予約する" },
        phone: { enabled: true, number: "03-0000-0000", label: "電話する" },
        line: { enabled: true, url: "https://line.me/example", label: "LINE相談" },
      }),
    },
  });
  console.log(`✅ 医院作成: ${clinic.name} (${clinic.id})`);

  // 2. サブスクリプション作成
  await prisma.subscription.upsert({
    where: { clinicId: clinic.id },
    update: {},
    create: {
      clinicId: clinic.id,
      status: "active",
      planType: "professional",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });
  console.log("✅ サブスクリプション作成 (professional)");

  // 3. 診断タイプ取得
  const diagnosisTypes = await prisma.diagnosisType.findMany({
    where: { slug: { in: DIAGNOSIS_SLUGS }, clinicId: null },
  });
  if (diagnosisTypes.length === 0) {
    console.error("❌ 診断タイプが見つかりません。先に npx tsx prisma/seed.ts を実行してください。");
    process.exit(1);
  }
  console.log(`✅ 診断タイプ ${diagnosisTypes.length}件取得`);

  // 4. QRコード（チャンネル）作成
  const channelDefs = [
    { name: "ポスティング用", slug: "oral-age", type: "diagnosis", budget: 50000 },
    { name: "駅看板A", slug: "periodontal-risk", type: "diagnosis", budget: 120000 },
    { name: "Instagram広告", slug: "whitening-check", type: "diagnosis", budget: 30000 },
    { name: "HP用リンク", slug: null, type: "link", budget: null },
  ];

  const channels = [];
  for (let i = 0; i < channelDefs.length; i++) {
    const def = channelDefs[i];
    const code = `debug-${def.name.replace(/[^a-zA-Z0-9]/g, "")}-${Date.now().toString(36).slice(-4)}${i}`;
    const channel = await prisma.channel.create({
      data: {
        clinicId: clinic.id,
        code,
        name: def.name,
        channelType: def.type,
        diagnosisTypeSlug: def.slug,
        redirectUrl: def.type === "link" ? "https://example.com" : null,
        isActive: true,
        sortOrder: i,
        budget: def.budget,
      },
    });
    channels.push(channel);
    console.log(`✅ QRコード作成: ${channel.name} (${channel.code})`);
  }

  // 診断タイプのマップ
  const diagTypeMap: Record<string, string> = {};
  for (const dt of diagnosisTypes) {
    diagTypeMap[dt.slug] = dt.id;
  }

  // 5. 診断セッション + アクセスログ + CTAクリック 200件作成
  console.log("\n📝 履歴データ200件を作成中...");

  const sessionsToCreate = [];
  const accessLogsToCreate = [];
  const ctaClicksToCreate = [];

  for (let i = 0; i < 200; i++) {
    const channel = randomChoice(channels);
    const isDiagnosis = channel.channelType === "diagnosis";
    const loc = randomChoice(REGIONS);
    const createdAt = randomDate(60); // 直近60日
    const gender = randomChoice(GENDERS);
    const age = randomInt(5, 85);
    const score = randomInt(10, 100);
    const category = randomChoice(RESULT_CATEGORIES);

    const diagTypeId = isDiagnosis && channel.diagnosisTypeSlug
      ? diagTypeMap[channel.diagnosisTypeSlug] || null
      : null;

    // セッションデータ
    sessionsToCreate.push({
      clinicId: clinic.id,
      channelId: channel.id,
      diagnosisTypeId: diagTypeId,
      sessionType: isDiagnosis ? "diagnosis" : "link",
      isDemo: false,
      isDeleted: false,
      userAge: isDiagnosis ? age : null,
      userGender: isDiagnosis ? gender : null,
      totalScore: isDiagnosis ? score : null,
      resultCategory: isDiagnosis ? category : null,
      completedAt: createdAt,
      createdAt,
      region: loc.region,
      city: loc.city,
      town: loc.town,
      latitude: loc.lat,
      longitude: loc.lng,
    });

    // アクセスログ（QRスキャン）
    accessLogsToCreate.push({
      clinicId: clinic.id,
      channelId: channel.id,
      diagnosisTypeSlug: channel.diagnosisTypeSlug,
      eventType: "qr_scan",
      isDeleted: false,
      createdAt: new Date(createdAt.getTime() - randomInt(1, 300) * 1000), // セッションの少し前
      region: loc.region,
      city: loc.city,
    });

    // CTAクリック（約40%の確率）
    if (Math.random() < 0.4) {
      ctaClicksToCreate.push({
        clinicId: clinic.id,
        channelId: channel.id,
        ctaType: randomChoice(CTA_TYPES),
        createdAt: new Date(createdAt.getTime() + randomInt(5, 120) * 1000), // セッションの少し後
        // sessionIdはセッション作成後に紐付け
        _index: i,
      });
    }
  }

  // バッチ作成: セッション
  const createdSessions = [];
  for (const data of sessionsToCreate) {
    const session = await prisma.diagnosisSession.create({ data });
    createdSessions.push(session);
  }
  console.log(`✅ 診断セッション ${createdSessions.length}件作成`);

  // バッチ作成: アクセスログ
  await prisma.accessLog.createMany({ data: accessLogsToCreate });
  console.log(`✅ アクセスログ ${accessLogsToCreate.length}件作成`);

  // バッチ作成: CTAクリック（セッションID紐付け）
  for (const cta of ctaClicksToCreate) {
    const sessionId = createdSessions[cta._index]?.id || null;
    await prisma.cTAClick.create({
      data: {
        clinicId: cta.clinicId,
        channelId: cta.channelId,
        sessionId,
        ctaType: cta.ctaType,
        createdAt: cta.createdAt,
      },
    });
  }
  console.log(`✅ CTAクリック ${ctaClicksToCreate.length}件作成`);

  // 医院紹介ページ閲覧ログも追加（20件）
  const clinicPageViews = [];
  for (let i = 0; i < 20; i++) {
    clinicPageViews.push({
      clinicId: clinic.id,
      channelId: null,
      eventType: "clinic_page_view",
      isDeleted: false,
      createdAt: randomDate(60),
    });
  }
  await prisma.accessLog.createMany({ data: clinicPageViews });
  console.log(`✅ 医院ページ閲覧ログ 20件作成`);

  console.log("\n🎉 完了!");
  console.log(`\n📋 ログイン情報:`);
  console.log(`   メール: debug@example.com`);
  console.log(`   パスワード: debug1234`);
  console.log(`   QRコード: ${channels.length}枚`);
  console.log(`   履歴: 200件`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
