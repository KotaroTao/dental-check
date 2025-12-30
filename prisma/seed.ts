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

const periodontalRiskDiagnosis = {
  slug: "periodontal-risk",
  name: "歯周病リスク診断",
  description: "簡単な質問に答えて、あなたの歯周病リスクをチェックしましょう",
  isActive: true,
  questions: [
    {
      id: 1,
      text: "歯磨きの時に歯茎から出血することがありますか？",
      choices: [
        { text: "毎回ある", score: 0 },
        { text: "よくある", score: 3 },
        { text: "たまにある", score: 7 },
        { text: "ほとんどない", score: 10 },
      ],
    },
    {
      id: 2,
      text: "歯茎が赤く腫れていると感じることはありますか？",
      choices: [
        { text: "常に腫れている", score: 0 },
        { text: "よく腫れる", score: 3 },
        { text: "たまに腫れる", score: 7 },
        { text: "腫れていない", score: 10 },
      ],
    },
    {
      id: 3,
      text: "口臭が気になることはありますか？",
      choices: [
        { text: "いつも気になる", score: 0 },
        { text: "よく気になる", score: 3 },
        { text: "たまに気になる", score: 7 },
        { text: "ほとんど気にならない", score: 10 },
      ],
    },
    {
      id: 4,
      text: "歯と歯の間に食べ物が詰まりやすくなりましたか？",
      choices: [
        { text: "とても詰まりやすい", score: 0 },
        { text: "詰まりやすい", score: 3 },
        { text: "少し詰まる", score: 7 },
        { text: "詰まらない", score: 10 },
      ],
    },
    {
      id: 5,
      text: "歯が長くなった（歯茎が下がった）ように感じますか？",
      choices: [
        { text: "かなり長くなった", score: 0 },
        { text: "少し長くなった", score: 5 },
        { text: "変わらない", score: 10 },
      ],
    },
    {
      id: 6,
      text: "歯がグラグラ動くことがありますか？",
      choices: [
        { text: "複数の歯がグラグラする", score: 0 },
        { text: "1本だけグラグラする", score: 3 },
        { text: "少し動く気がする", score: 7 },
        { text: "動かない", score: 10 },
      ],
    },
    {
      id: 7,
      text: "硬いものを噛むと痛みや違和感がありますか？",
      choices: [
        { text: "よくある", score: 0 },
        { text: "たまにある", score: 5 },
        { text: "ほとんどない", score: 10 },
      ],
    },
    {
      id: 8,
      text: "喫煙習慣はありますか？",
      choices: [
        { text: "毎日吸う", score: 0 },
        { text: "たまに吸う", score: 3 },
        { text: "以前吸っていた", score: 7 },
        { text: "吸わない", score: 10 },
      ],
    },
    {
      id: 9,
      text: "糖尿病と診断されたことはありますか？",
      choices: [
        { text: "はい、治療中", score: 0 },
        { text: "予備軍と言われた", score: 5 },
        { text: "いいえ", score: 10 },
      ],
    },
    {
      id: 10,
      text: "定期的に歯科検診やクリーニングを受けていますか？",
      choices: [
        { text: "受けていない", score: 0 },
        { text: "1年に1回程度", score: 5 },
        { text: "半年に1回程度", score: 8 },
        { text: "3ヶ月に1回以上", score: 10 },
      ],
    },
  ],
  resultPatterns: [
    {
      minScore: 0,
      maxScore: 30,
      category: "高リスク",
      title: "歯周病の可能性が高いです",
      message:
        "歯周病の症状が複数見られます。できるだけ早く歯科医院を受診し、専門的な検査と治療を受けることを強くおすすめします。歯周病は放置すると歯を失う原因になります。",
    },
    {
      minScore: 31,
      maxScore: 50,
      category: "中リスク",
      title: "歯周病の初期症状があるかもしれません",
      message:
        "いくつか気になる症状があります。早めに歯科医院でチェックを受けることをおすすめします。初期段階であれば、適切なケアで改善できる可能性があります。",
    },
    {
      minScore: 51,
      maxScore: 70,
      category: "やや注意",
      title: "予防を心がけましょう",
      message:
        "現時点では大きな問題はなさそうですが、油断は禁物です。毎日の丁寧なブラッシングと定期検診で、歯周病を予防しましょう。",
    },
    {
      minScore: 71,
      maxScore: 85,
      category: "低リスク",
      title: "良い状態を維持しています",
      message:
        "歯茎の状態は良好です。今のケアを続けながら、定期的な歯科検診を受けて、健康な歯茎を維持しましょう。",
    },
    {
      minScore: 86,
      maxScore: 100,
      category: "優良",
      title: "素晴らしい歯茎の健康状態です",
      message:
        "歯周病のリスクは非常に低いです。素晴らしいオーラルケアができています！この調子で継続してください。",
    },
  ],
};

const cavityRiskDiagnosis = {
  slug: "cavity-risk",
  name: "虫歯リスク診断",
  description: "簡単な質問に答えて、あなたの虫歯リスクをチェックしましょう",
  isActive: true,
  questions: [
    {
      id: 1,
      text: "1日に何回歯磨きをしますか？",
      choices: [
        { text: "0回または不定期", score: 0 },
        { text: "1回", score: 5 },
        { text: "2回", score: 8 },
        { text: "3回以上", score: 10 },
      ],
    },
    {
      id: 2,
      text: "甘い飲み物（ジュース、炭酸飲料、スポーツドリンクなど）をどのくらい飲みますか？",
      choices: [
        { text: "毎日複数回", score: 0 },
        { text: "毎日1回程度", score: 3 },
        { text: "週に数回", score: 7 },
        { text: "ほとんど飲まない", score: 10 },
      ],
    },
    {
      id: 3,
      text: "間食（おやつ）をどのくらいの頻度で摂りますか？",
      choices: [
        { text: "1日3回以上", score: 0 },
        { text: "1日2回程度", score: 3 },
        { text: "1日1回程度", score: 7 },
        { text: "ほとんど摂らない", score: 10 },
      ],
    },
    {
      id: 4,
      text: "フッ素入りの歯磨き粉を使用していますか？",
      choices: [
        { text: "使っていない", score: 0 },
        { text: "わからない", score: 5 },
        { text: "使っている", score: 10 },
      ],
    },
    {
      id: 5,
      text: "歯と歯の間のケア（フロス・歯間ブラシ）をしていますか？",
      choices: [
        { text: "していない", score: 0 },
        { text: "たまにする", score: 5 },
        { text: "毎日する", score: 10 },
      ],
    },
    {
      id: 6,
      text: "冷たいものや甘いものがしみることがありますか？",
      choices: [
        { text: "よくある", score: 0 },
        { text: "たまにある", score: 5 },
        { text: "ほとんどない", score: 10 },
      ],
    },
    {
      id: 7,
      text: "過去1年間に虫歯の治療を受けましたか？",
      choices: [
        { text: "複数本治療した", score: 0 },
        { text: "1本治療した", score: 5 },
        { text: "治療していない", score: 10 },
      ],
    },
    {
      id: 8,
      text: "定期的に歯科検診を受けていますか？",
      choices: [
        { text: "受けていない", score: 0 },
        { text: "1年に1回程度", score: 5 },
        { text: "半年に1回以上", score: 10 },
      ],
    },
    {
      id: 9,
      text: "口の中が乾きやすいと感じますか？",
      choices: [
        { text: "よく乾く", score: 0 },
        { text: "たまに乾く", score: 5 },
        { text: "乾かない", score: 10 },
      ],
    },
    {
      id: 10,
      text: "寝る前に歯磨きをしていますか？",
      choices: [
        { text: "しないことが多い", score: 0 },
        { text: "時々忘れる", score: 5 },
        { text: "毎日している", score: 10 },
      ],
    },
  ],
  resultPatterns: [
    {
      minScore: 0,
      maxScore: 30,
      category: "高リスク",
      title: "虫歯になりやすい状態です",
      message:
        "虫歯リスクが高い状態です。できるだけ早く歯科医院で検診を受け、虫歯がないかチェックしてもらいましょう。食生活や歯磨き習慣の改善も重要です。",
    },
    {
      minScore: 31,
      maxScore: 50,
      category: "中リスク",
      title: "虫歯に注意が必要です",
      message:
        "いくつかリスク要因があります。定期的な歯科検診を受けながら、間食の回数を減らしたり、フッ素入り歯磨き粉を使うなど、予防を心がけましょう。",
    },
    {
      minScore: 51,
      maxScore: 70,
      category: "やや注意",
      title: "予防を続けましょう",
      message:
        "比較的良い状態ですが、油断は禁物です。今のケアを続けながら、定期検診で虫歯の早期発見を心がけましょう。",
    },
    {
      minScore: 71,
      maxScore: 85,
      category: "低リスク",
      title: "良い習慣が身についています",
      message:
        "虫歯リスクは低めです。今の良い習慣を継続しながら、定期的な歯科検診で健康な歯を維持しましょう。",
    },
    {
      minScore: 86,
      maxScore: 100,
      category: "優良",
      title: "素晴らしい虫歯予防ができています",
      message:
        "虫歯リスクは非常に低いです！素晴らしいオーラルケアと生活習慣が身についています。この調子で継続してください。",
    },
  ],
};

const whiteningCheckDiagnosis = {
  slug: "whitening-check",
  name: "ホワイトニング適正診断",
  description: "ホワイトニングがあなたに適しているかチェックしましょう",
  isActive: true,
  questions: [
    {
      id: 1,
      text: "歯の色で気になることはありますか？",
      choices: [
        { text: "全体的に黄ばんでいる", score: 10 },
        { text: "部分的に気になる", score: 7 },
        { text: "少し気になる程度", score: 5 },
        { text: "特に気にならない", score: 0 },
      ],
    },
    {
      id: 2,
      text: "コーヒー、紅茶、ワインなどをよく飲みますか？",
      choices: [
        { text: "毎日複数回飲む", score: 10 },
        { text: "毎日1回程度", score: 7 },
        { text: "週に数回程度", score: 3 },
        { text: "ほとんど飲まない", score: 0 },
      ],
    },
    {
      id: 3,
      text: "喫煙習慣はありますか？",
      choices: [
        { text: "現在吸っている", score: 10 },
        { text: "以前吸っていた", score: 5 },
        { text: "吸ったことがない", score: 0 },
      ],
    },
    {
      id: 4,
      text: "知覚過敏（冷たいものがしみる）の症状はありますか？",
      choices: [
        { text: "よくしみる", score: 0 },
        { text: "たまにしみる", score: 5 },
        { text: "ほとんどしみない", score: 10 },
      ],
    },
    {
      id: 5,
      text: "虫歯や歯周病の治療中ですか？",
      choices: [
        { text: "現在治療中", score: 0 },
        { text: "治療予定がある", score: 3 },
        { text: "特にない", score: 10 },
      ],
    },
    {
      id: 6,
      text: "前歯に詰め物や被せ物はありますか？",
      choices: [
        { text: "複数ある", score: 3 },
        { text: "1〜2本ある", score: 5 },
        { text: "ない", score: 10 },
      ],
    },
    {
      id: 7,
      text: "妊娠中または授乳中ですか？",
      choices: [
        { text: "はい", score: 0 },
        { text: "いいえ", score: 10 },
      ],
    },
    {
      id: 8,
      text: "歯の変色の原因に心当たりはありますか？",
      choices: [
        { text: "加齢による変色", score: 10 },
        { text: "飲食物による着色", score: 10 },
        { text: "薬の副作用（テトラサイクリンなど）", score: 3 },
        { text: "わからない", score: 7 },
      ],
    },
    {
      id: 9,
      text: "結婚式や大切なイベントの予定はありますか？",
      choices: [
        { text: "1ヶ月以内にある", score: 10 },
        { text: "3ヶ月以内にある", score: 8 },
        { text: "半年以内にある", score: 5 },
        { text: "特にない", score: 3 },
      ],
    },
    {
      id: 10,
      text: "白い歯への関心度はどのくらいですか？",
      choices: [
        { text: "とても関心がある", score: 10 },
        { text: "まあまあ関心がある", score: 7 },
        { text: "少し関心がある", score: 3 },
        { text: "あまり関心がない", score: 0 },
      ],
    },
  ],
  resultPatterns: [
    {
      minScore: 0,
      maxScore: 30,
      category: "要相談",
      title: "まずは歯科医師に相談しましょう",
      message:
        "現時点ではホワイトニングを行う前に、歯科医師への相談が必要です。虫歯や歯周病の治療、知覚過敏の対策など、まずはお口の健康を整えることをおすすめします。",
    },
    {
      minScore: 31,
      maxScore: 50,
      category: "条件付き適正",
      title: "条件が整えばホワイトニング可能です",
      message:
        "いくつか確認が必要な点があります。歯科医院でカウンセリングを受けて、あなたに適したホワイトニング方法を相談してみましょう。",
    },
    {
      minScore: 51,
      maxScore: 70,
      category: "適正あり",
      title: "ホワイトニングに適しています",
      message:
        "ホワイトニングを受けるのに良い条件が揃っています。オフィスホワイトニングとホームホワイトニング、どちらが合うか歯科医院で相談してみましょう。",
    },
    {
      minScore: 71,
      maxScore: 85,
      category: "高い適正",
      title: "ホワイトニングがおすすめです",
      message:
        "ホワイトニングに非常に適した状態です。効果も出やすいでしょう。ぜひ歯科医院でカウンセリングを受けて、理想の白さを手に入れましょう。",
    },
    {
      minScore: 86,
      maxScore: 100,
      category: "最適",
      title: "ホワイトニングで大きな効果が期待できます",
      message:
        "ホワイトニングの効果が最も期待できる状態です！白い歯への関心も高く、良い結果が得られるでしょう。お近くの歯科医院でカウンセリングを受けてみてください。",
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

  // 歯周病リスク診断を upsert
  const periodontal = await prisma.diagnosisType.upsert({
    where: { slug: "periodontal-risk" },
    update: {
      name: periodontalRiskDiagnosis.name,
      description: periodontalRiskDiagnosis.description,
      questions: periodontalRiskDiagnosis.questions,
      resultPatterns: periodontalRiskDiagnosis.resultPatterns,
      isActive: periodontalRiskDiagnosis.isActive,
    },
    create: periodontalRiskDiagnosis,
  });
  console.log(`✅ Created/Updated: ${periodontal.name} (${periodontal.slug})`);

  // 虫歯リスク診断を upsert
  const cavity = await prisma.diagnosisType.upsert({
    where: { slug: "cavity-risk" },
    update: {
      name: cavityRiskDiagnosis.name,
      description: cavityRiskDiagnosis.description,
      questions: cavityRiskDiagnosis.questions,
      resultPatterns: cavityRiskDiagnosis.resultPatterns,
      isActive: cavityRiskDiagnosis.isActive,
    },
    create: cavityRiskDiagnosis,
  });
  console.log(`✅ Created/Updated: ${cavity.name} (${cavity.slug})`);

  // ホワイトニング適正診断を upsert
  const whitening = await prisma.diagnosisType.upsert({
    where: { slug: "whitening-check" },
    update: {
      name: whiteningCheckDiagnosis.name,
      description: whiteningCheckDiagnosis.description,
      questions: whiteningCheckDiagnosis.questions,
      resultPatterns: whiteningCheckDiagnosis.resultPatterns,
      isActive: whiteningCheckDiagnosis.isActive,
    },
    create: whiteningCheckDiagnosis,
  });
  console.log(`✅ Created/Updated: ${whitening.name} (${whitening.slug})`);

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
