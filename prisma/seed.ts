import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const oralAgeDiagnosis = {
  slug: "oral-age",
  name: "お口年齢診断",
  description: "簡単な質問に答えて、あなたのお口年齢をチェックしましょう",
  isActive: true,
  questions: [
    {
      id: 1,
      text: "1日の歯磨き回数は？",
      choices: [
        { text: "0回", score: 0 },
        { text: "1回", score: 5 },
        { text: "2回", score: 10 },
        { text: "3回以上", score: 10 },
      ],
    },
    {
      id: 2,
      text: "歯間ブラシやフロスを使っていますか？",
      choices: [
        { text: "使っていない", score: 0 },
        { text: "たまに", score: 5 },
        { text: "毎日", score: 10 },
      ],
    },
    {
      id: 3,
      text: "定期的に歯科検診を受けていますか？",
      choices: [
        { text: "受けていない", score: 0 },
        { text: "年1回程度", score: 5 },
        { text: "半年に1回以上", score: 10 },
      ],
    },
    {
      id: 4,
      text: "歯茎から出血することがありますか？",
      choices: [
        { text: "よくある", score: 0 },
        { text: "たまにある", score: 5 },
        { text: "ほとんどない", score: 10 },
      ],
    },
    {
      id: 5,
      text: "口臭が気になることはありますか？",
      choices: [
        { text: "よくある", score: 0 },
        { text: "たまにある", score: 5 },
        { text: "ほとんどない", score: 10 },
      ],
    },
    {
      id: 6,
      text: "冷たいものや熱いものがしみますか？",
      choices: [
        { text: "よくある", score: 0 },
        { text: "たまにある", score: 5 },
        { text: "ほとんどない", score: 10 },
      ],
    },
    {
      id: 7,
      text: "歯がグラグラする感じはありますか？",
      choices: [
        { text: "ある", score: 0 },
        { text: "少しある", score: 5 },
        { text: "ない", score: 10 },
      ],
    },
    {
      id: 8,
      text: "喫煙習慣はありますか？",
      choices: [
        { text: "吸う", score: 0 },
        { text: "以前吸っていた", score: 5 },
        { text: "吸わない", score: 10 },
      ],
    },
    {
      id: 9,
      text: "甘い飲み物やお菓子をよく摂りますか？",
      choices: [
        { text: "よく摂る", score: 0 },
        { text: "たまに", score: 5 },
        { text: "あまり摂らない", score: 10 },
      ],
    },
    {
      id: 10,
      text: "最後に歯科医院に行ったのはいつですか？",
      choices: [
        { text: "1年以上前", score: 0 },
        { text: "半年〜1年前", score: 5 },
        { text: "半年以内", score: 10 },
      ],
    },
  ],
  resultPatterns: [
    {
      minScore: 0,
      maxScore: 30,
      category: "要注意",
      title: "お口の健康に赤信号",
      message:
        "お口の健康に赤信号です。すぐに歯科医院での検診をおすすめします。",
      ageModifier: 15,
    },
    {
      minScore: 31,
      maxScore: 50,
      category: "注意",
      title: "改善の余地あり",
      message:
        "お口のケアに改善の余地があります。定期検診を受けてみましょう。",
      ageModifier: 10,
    },
    {
      minScore: 51,
      maxScore: 70,
      category: "やや注意",
      title: "まずまずのケア",
      message:
        "まずまずのケアができていますが、もう少し意識を高めましょう。",
      ageModifier: 5,
    },
    {
      minScore: 71,
      maxScore: 85,
      category: "良好",
      title: "良いケアができています",
      message: "良いケアができています。この調子で続けましょう。",
      ageModifier: 0,
    },
    {
      minScore: 86,
      maxScore: 100,
      category: "優秀",
      title: "素晴らしいケア",
      message:
        "素晴らしいお口のケアです！定期検診で維持していきましょう。",
      ageModifier: -5,
    },
  ],
};

const childOrthodonticsDiagnosis = {
  slug: "child-orthodontics",
  name: "子供の矯正タイミングチェック",
  description:
    "お子さんの歯並びや矯正のタイミングについてチェックしましょう",
  isActive: true,
  questions: [
    {
      id: 1,
      text: "お子さんの年齢は？",
      choices: [
        { text: "3〜5歳", score: 0 },
        { text: "6〜8歳", score: 0 },
        { text: "9〜12歳", score: 0 },
      ],
    },
    {
      id: 2,
      text: "指しゃぶりや爪を噛む癖がありますか（ありましたか）？",
      choices: [
        { text: "現在もある", score: 10 },
        { text: "以前あった", score: 5 },
        { text: "ない", score: 0 },
      ],
    },
    {
      id: 3,
      text: "口呼吸をしていることが多いですか？",
      choices: [
        { text: "はい", score: 10 },
        { text: "時々", score: 5 },
        { text: "いいえ", score: 0 },
      ],
    },
    {
      id: 4,
      text: "乳歯の生え変わりは順調ですか？",
      choices: [
        { text: "遅い気がする", score: 5 },
        { text: "普通", score: 0 },
        { text: "早い気がする", score: 5 },
      ],
    },
    {
      id: 5,
      text: "歯並びで気になる点はありますか？",
      choices: [
        { text: "とても気になる", score: 10 },
        { text: "少し気になる", score: 5 },
        { text: "特にない", score: 0 },
      ],
    },
    {
      id: 6,
      text: "食べ物を噛むとき、片側だけで噛んでいませんか？",
      choices: [
        { text: "はい", score: 10 },
        { text: "時々", score: 5 },
        { text: "いいえ", score: 0 },
      ],
    },
    {
      id: 7,
      text: "発音で気になる点はありますか？",
      choices: [
        { text: "ある", score: 10 },
        { text: "少しある", score: 5 },
        { text: "ない", score: 0 },
      ],
    },
    {
      id: 8,
      text: "顔の左右で非対称な部分がありますか？",
      choices: [
        { text: "気になる", score: 10 },
        { text: "少し気になる", score: 5 },
        { text: "気にならない", score: 0 },
      ],
    },
    {
      id: 9,
      text: "ご家族に歯並びの悪い方はいますか？",
      choices: [
        { text: "いる", score: 10 },
        { text: "わからない", score: 5 },
        { text: "いない", score: 0 },
      ],
    },
    {
      id: 10,
      text: "以前、歯科医院で歯並びについて指摘を受けたことはありますか？",
      choices: [
        { text: "ある", score: 10 },
        { text: "覚えていない", score: 5 },
        { text: "ない", score: 0 },
      ],
    },
  ],
  resultPatterns: [
    {
      minScore: 0,
      maxScore: 20,
      category: "様子見",
      title: "今すぐの矯正は不要かもしれません",
      message:
        "現時点では大きな問題は見られません。ただし、成長とともに変化することがありますので、定期的なチェックをおすすめします。",
    },
    {
      minScore: 21,
      maxScore: 45,
      category: "相談推奨",
      title: "一度専門家に相談してみましょう",
      message:
        "いくつか気になるポイントがあります。矯正専門医への相談をおすすめします。早期発見が治療の選択肢を広げます。",
    },
    {
      minScore: 46,
      maxScore: 70,
      category: "早期相談",
      title: "早めの相談をおすすめします",
      message:
        "矯正治療の検討をおすすめする兆候が見られます。お子さんの成長段階に合わせた最適な治療タイミングを相談しましょう。",
    },
    {
      minScore: 71,
      maxScore: 100,
      category: "至急相談",
      title: "できるだけ早く専門医へ",
      message:
        "複数の気になる兆候があります。早期に矯正専門医の診察を受けることを強くおすすめします。",
    },
  ],
};

async function main() {
  console.log("🌱 Seeding diagnosis types...");

  // お口年齢診断を upsert
  const oralAge = await prisma.diagnosisType.upsert({
    where: { slug: "oral-age" },
    update: {
      name: oralAgeDiagnosis.name,
      description: oralAgeDiagnosis.description,
      questions: oralAgeDiagnosis.questions,
      resultPatterns: oralAgeDiagnosis.resultPatterns,
      isActive: oralAgeDiagnosis.isActive,
    },
    create: oralAgeDiagnosis,
  });
  console.log(`✅ Created/Updated: ${oralAge.name} (${oralAge.slug})`);

  // 子供の矯正タイミングチェックを upsert
  const childOrtho = await prisma.diagnosisType.upsert({
    where: { slug: "child-orthodontics" },
    update: {
      name: childOrthodonticsDiagnosis.name,
      description: childOrthodonticsDiagnosis.description,
      questions: childOrthodonticsDiagnosis.questions,
      resultPatterns: childOrthodonticsDiagnosis.resultPatterns,
      isActive: childOrthodonticsDiagnosis.isActive,
    },
    create: childOrthodonticsDiagnosis,
  });
  console.log(`✅ Created/Updated: ${childOrtho.name} (${childOrtho.slug})`);

  console.log("\n🎉 Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
