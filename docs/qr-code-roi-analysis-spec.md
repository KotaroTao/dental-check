# QRコード費用対効果分析機能 仕様書

## 1. 概要

### 1.1 目的
QRコード（広告チャネル）ごとに予算を設定し、地域・年齢・性別などの条件でフィルタリングしながら、費用対効果（ROI）を直感的に把握できる機能を提供する。

### 1.2 ターゲットユーザー
- 広告の専門家ではない歯科医院のスタッフ
- マーケティング知識がなくても、どの広告が効果的かを一目で判断したい人

### 1.3 主な機能
1. 各QRコードに予算を設定
2. 条件別（地域・年齢・性別）の費用対効果を可視化
3. わかりやすいダッシュボードUI

---

## 2. データモデル変更

### 2.1 Channelモデルへの追加フィールド

```prisma
model Channel {
  // 既存フィールド...

  // 新規追加: 予算関連
  budget            Int?      @map("budget")           // 予算（円）
  budgetPeriod      String?   @default("month") @map("budget_period")  // "month" | "total"
  budgetStartDate   DateTime? @map("budget_start_date") // 予算開始日
  budgetEndDate     DateTime? @map("budget_end_date")   // 予算終了日（任意）
}
```

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `budget` | Int? | 予算金額（円）。nullは未設定 |
| `budgetPeriod` | String? | 予算期間タイプ。`month`=月額、`total`=総額 |
| `budgetStartDate` | DateTime? | 予算計測開始日 |
| `budgetEndDate` | DateTime? | 予算計測終了日（nullは現在進行中） |

---

## 3. 費用対効果（ROI）指標の定義

### 3.1 基本指標

| 指標名 | 計算式 | 説明 | UI表示 |
|--------|--------|------|--------|
| **アクセス単価** | 予算 ÷ アクセス数 | 1アクセスあたりのコスト | 「〇〇円/アクセス」 |
| **診断完了単価** | 予算 ÷ 診断完了数 | 診断を完了させるコスト | 「〇〇円/診断完了」 |
| **CTA単価** | 予算 ÷ CTAクリック数 | 行動を起こさせるコスト | 「〇〇円/CTA」 |
| **効果スコア** | (CTA数 × 1000) ÷ 予算 | 1000円あたりのCTA数 | 「★★★★☆」(5段階) |

### 3.2 効果スコアの評価基準

```
★★★★★ (非常に良い): 5.0以上  → 1000円で5件以上のCTA
★★★★☆ (良い):       3.0-4.9 → 1000円で3-4件のCTA
★★★☆☆ (普通):       1.5-2.9 → 1000円で1.5-2件のCTA
★★☆☆☆ (改善必要):   0.5-1.4 → 1000円で1件程度のCTA
★☆☆☆☆ (要見直し):   0.5未満 → 効果が低い
```

### 3.3 条件別ROI

地域・年齢・性別の各セグメントごとに上記指標を算出し、比較可能にする。

---

## 4. API設計

### 4.1 QRコード予算設定 API

#### `PATCH /api/channels/[id]` (既存APIを拡張)

**リクエスト**
```json
{
  "budget": 50000,
  "budgetPeriod": "month",
  "budgetStartDate": "2026-01-01T00:00:00.000Z",
  "budgetEndDate": null
}
```

**レスポンス**
```json
{
  "id": "xxx",
  "name": "駅看板QR",
  "budget": 50000,
  "budgetPeriod": "month",
  "budgetStartDate": "2026-01-01T00:00:00.000Z",
  "budgetEndDate": null
}
```

### 4.2 費用対効果分析 API

#### `GET /api/dashboard/roi-analysis`

**クエリパラメータ**
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `channelIds` | string | × | カンマ区切りのチャンネルID（未指定で全チャンネル） |
| `period` | string | × | `today`, `week`, `month`, `custom` |
| `startDate` | string | × | 開始日（custom時） |
| `endDate` | string | × | 終了日（custom時） |
| `region` | string | × | 地域フィルター（都道府県名） |
| `ageGroup` | string | × | 年齢層フィルター（例: `20-29`, `30-39`） |
| `gender` | string | × | 性別フィルター（`male`, `female`, `other`） |

**レスポンス**
```json
{
  "summary": {
    "totalBudget": 150000,
    "totalAccess": 3500,
    "totalCompleted": 1200,
    "totalCta": 180,
    "costPerAccess": 43,
    "costPerCompleted": 125,
    "costPerCta": 833,
    "effectScore": 1.2,
    "effectRating": 3
  },
  "byChannel": [
    {
      "channelId": "xxx",
      "channelName": "駅看板QR",
      "budget": 50000,
      "accessCount": 1500,
      "completedCount": 500,
      "ctaCount": 80,
      "costPerAccess": 33,
      "costPerCompleted": 100,
      "costPerCta": 625,
      "effectScore": 1.6,
      "effectRating": 4
    }
  ],
  "bySegment": {
    "region": [
      {
        "name": "東京都",
        "accessCount": 800,
        "completedCount": 300,
        "ctaCount": 50,
        "allocatedBudget": 34286,
        "costPerCta": 686,
        "effectScore": 1.5,
        "effectRating": 3
      }
    ],
    "ageGroup": [
      {
        "name": "30-39",
        "accessCount": 600,
        "completedCount": 250,
        "ctaCount": 45,
        "allocatedBudget": 25714,
        "costPerCta": 571,
        "effectScore": 1.8,
        "effectRating": 4
      }
    ],
    "gender": [
      {
        "name": "女性",
        "accessCount": 2000,
        "completedCount": 800,
        "ctaCount": 130,
        "allocatedBudget": 85714,
        "costPerCta": 659,
        "effectScore": 1.5,
        "effectRating": 3
      }
    ]
  },
  "insights": [
    {
      "type": "positive",
      "message": "30代女性のCTA率が最も高いです",
      "recommendation": "この層に向けた広告を強化すると効果的です"
    },
    {
      "type": "warning",
      "message": "Instagram広告QRのコストパフォーマンスが低下しています",
      "recommendation": "クリエイティブの見直しを検討してください"
    }
  ],
  "filters": {
    "region": null,
    "ageGroup": null,
    "gender": null
  }
}
```

---

## 5. UI設計

### 5.1 ページ構成

新規ページ: `/dashboard/roi-analysis`

```
┌─────────────────────────────────────────────────────────────┐
│  📊 費用対効果分析                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ フィルター ─────────────────────────────────────────┐  │
│  │ 📅 期間: [今月 ▼]  🗺️ 地域: [すべて ▼]              │  │
│  │ 👤 年齢: [すべて ▼]  ⚧ 性別: [すべて ▼]             │  │
│  │ 📱 QRコード: [すべて選択 ▼]                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ 全体サマリー ───────────────────────────────────────┐  │
│  │  💰 総予算        📱 アクセス      ✅ 診断完了       │  │
│  │   ¥150,000         3,500回         1,200回          │  │
│  │                                                      │  │
│  │  🎯 CTA           📊 効果スコア                      │  │
│  │   180回            ★★★☆☆ (普通)                    │  │
│  │   ¥833/CTA                                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ QRコード別 効果比較 ────────────────────────────────┐  │
│  │                                                      │  │
│  │  🏆 効果が高い順                                     │  │
│  │  ┌────────────────────────────────────────────┐    │  │
│  │  │ 1. 📍 駅看板QR                              │    │  │
│  │  │    ★★★★☆  ¥625/CTA  80件のCTA            │    │  │
│  │  │    ████████████░░░░  予算¥50,000           │    │  │
│  │  └────────────────────────────────────────────┘    │  │
│  │  ┌────────────────────────────────────────────┐    │  │
│  │  │ 2. 📄 ポスティングQR                        │    │  │
│  │  │    ★★★☆☆  ¥900/CTA  55件のCTA            │    │  │
│  │  │    ██████████░░░░░░  予算¥50,000           │    │  │
│  │  └────────────────────────────────────────────┘    │  │
│  │  ┌────────────────────────────────────────────┐    │  │
│  │  │ 3. 📸 Instagram広告QR                       │    │  │
│  │  │    ★★☆☆☆  ¥1,111/CTA  45件のCTA          │    │  │
│  │  │    ████████░░░░░░░░  予算¥50,000           │    │  │
│  │  └────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ セグメント別分析（タブ切り替え）─────────────────────┐  │
│  │ [🗺️ 地域別] [👤 年齢別] [⚧ 性別]                   │  │
│  │                                                      │  │
│  │  ┌─ 地域別 効果マップ ───────────────────────────┐  │  │
│  │  │                                               │  │  │
│  │  │   東京都  ★★★★☆ ¥686/CTA  50件            │  │  │
│  │  │   神奈川県 ★★★☆☆ ¥750/CTA  40件           │  │  │
│  │  │   埼玉県  ★★★☆☆ ¥800/CTA  30件            │  │  │
│  │  │   千葉県  ★★☆☆☆ ¥1,000/CTA  20件          │  │  │
│  │  │                                               │  │  │
│  │  └───────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ 💡 AIアドバイス ────────────────────────────────────┐  │
│  │                                                      │  │
│  │  ✅ 30代女性からの反応が最も良好です                │  │
│  │     → この層に向けた広告強化がおすすめ              │  │
│  │                                                      │  │
│  │  ⚠️ Instagram広告QRの効果が低下傾向にあります       │  │
│  │     → クリエイティブの更新を検討してください        │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 QRコード編集画面への予算追加

既存の `/dashboard/channels` ページのQRコード編集モーダルに予算セクションを追加：

```
┌─ QRコード編集 ──────────────────────────────────────────────┐
│                                                             │
│  名前: [駅看板QR________________________]                   │
│                                                             │
│  説明: [駅構内の看板に掲載するQRコード______]               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  💰 予算設定（任意）                                        │
│                                                             │
│  予算タイプ: ○ 月額  ● 総額                                │
│                                                             │
│  予算金額: [¥ 50,000__________]                             │
│                                                             │
│  期間:                                                      │
│  開始日 [2026/01/01] 〜 終了日 [未設定_____]               │
│                                                             │
│  💡 予算を設定すると、費用対効果分析で                      │
│     このQRコードの効果を確認できます                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│              [キャンセル]  [保存]                            │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 ダッシュボードへのナビゲーション追加

サイドバーに「費用対効果分析」メニューを追加：

```
📊 ダッシュボード
📱 QRコード管理
📈 費用対効果分析  ← 新規追加
🗺️ 地域分析
📋 診断履歴
⚙️ 設定
```

---

## 6. UIコンポーネント設計

### 6.1 新規コンポーネント

| コンポーネント | ファイルパス | 説明 |
|--------------|-------------|------|
| `ROIAnalysisPage` | `src/app/dashboard/roi-analysis/page.tsx` | メインページ |
| `ROISummaryCard` | `src/components/dashboard/roi-summary-card.tsx` | 全体サマリー表示 |
| `ROIChannelCard` | `src/components/dashboard/roi-channel-card.tsx` | QRコード別効果カード |
| `ROISegmentTabs` | `src/components/dashboard/roi-segment-tabs.tsx` | セグメント別タブ |
| `ROIFilterBar` | `src/components/dashboard/roi-filter-bar.tsx` | フィルターバー |
| `EffectRating` | `src/components/dashboard/effect-rating.tsx` | 効果スコア星表示 |
| `ROIInsights` | `src/components/dashboard/roi-insights.tsx` | AIアドバイス表示 |
| `BudgetForm` | `src/components/channel/budget-form.tsx` | 予算設定フォーム |

### 6.2 効果スコア表示コンポーネント

```tsx
// EffectRating.tsx
interface Props {
  score: number;      // 0.0 - 10.0
  rating: 1 | 2 | 3 | 4 | 5;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

// 表示例:
// ★★★★☆ 良い
// ★★☆☆☆ 改善必要
```

### 6.3 わかりやすさの工夫

1. **色による直感的理解**
   - 緑: 効果が高い (★★★★☆以上)
   - 黄: 普通 (★★★☆☆)
   - オレンジ: 改善必要 (★★☆☆☆)
   - 赤: 要見直し (★☆☆☆☆)

2. **専門用語の言い換え**
   - ROI → 「効果スコア」
   - CPA → 「1件あたりのコスト」
   - コンバージョン → 「成果」
   - セグメント → 「グループ」

3. **ツールチップによる説明**
   ```
   💡 効果スコアとは？
   1,000円あたりで何件の問い合わせや
   予約につながったかを表す指標です。
   スコアが高いほど、コスパが良いです。
   ```

---

## 7. 実装計画

### 7.1 Phase 1: データベース・API (優先度: 高)

1. Prismaスキーマ更新（Channelに予算フィールド追加）
2. マイグレーション実行
3. `PATCH /api/channels/[id]` 予算更新対応
4. `GET /api/dashboard/roi-analysis` 新規作成

### 7.2 Phase 2: QRコード管理画面 (優先度: 高)

1. QRコード編集モーダルに予算設定フォーム追加
2. QRコード一覧に予算表示追加

### 7.3 Phase 3: ROI分析ダッシュボード (優先度: 高)

1. `/dashboard/roi-analysis` ページ作成
2. フィルターバー実装
3. サマリーカード実装
4. QRコード別効果カード実装

### 7.4 Phase 4: セグメント分析 (優先度: 中)

1. 地域別分析タブ
2. 年齢別分析タブ
3. 性別分析タブ

### 7.5 Phase 5: AIアドバイス (優先度: 低)

1. インサイト生成ロジック
2. アドバイス表示コンポーネント

---

## 8. 技術仕様

### 8.1 予算の按分計算

セグメント別の予算は、アクセス数の比率で按分：

```typescript
// 地域別の予算按分例
const regionBudget = (regionAccessCount / totalAccessCount) * totalBudget;
```

### 8.2 効果スコア計算ロジック

```typescript
function calculateEffectScore(ctaCount: number, budget: number): number {
  if (budget === 0) return 0;
  return (ctaCount * 1000) / budget;
}

function getEffectRating(score: number): 1 | 2 | 3 | 4 | 5 {
  if (score >= 5.0) return 5;
  if (score >= 3.0) return 4;
  if (score >= 1.5) return 3;
  if (score >= 0.5) return 2;
  return 1;
}
```

### 8.3 インサイト生成ルール

```typescript
const insightRules = [
  // 最も効果が高いセグメントを特定
  {
    condition: (data) => data.bestSegment.score > data.averageScore * 1.5,
    type: "positive",
    message: (data) => `${data.bestSegment.name}からの反応が最も良好です`,
    recommendation: "この層に向けた広告強化がおすすめ"
  },
  // 効果が低下しているチャンネルを警告
  {
    condition: (data) => data.trendDown.length > 0,
    type: "warning",
    message: (data) => `${data.trendDown[0].name}の効果が低下傾向にあります`,
    recommendation: "クリエイティブの更新を検討してください"
  }
];
```

---

## 9. セキュリティ・権限

- 予算情報は各クリニックのみ閲覧・編集可能
- 認証済みユーザーのみアクセス可能（既存の認証システムを使用）
- プランによる機能制限なし（全プランで利用可能）

---

## 10. 将来の拡張

### 10.1 予定機能
- 予算アラート（残予算が少なくなったら通知）
- 予算の自動最適化提案
- 期間比較レポート（前月比など）
- PDFレポート出力

### 10.2 考慮事項
- 複数通貨対応（将来の海外展開時）
- 外部広告プラットフォームとの連携（Google Ads等）

---

## 11. 用語集

| 用語 | UI表示 | 説明 |
|------|--------|------|
| ROI | 効果スコア | 投資対効果。予算あたりの成果 |
| CPA | ○○円/CTA | 1成果あたりのコスト |
| Conversion | 成果・CTA | ユーザーが行動を起こした回数 |
| Segment | グループ | 地域・年齢・性別などのユーザー区分 |
| Channel | QRコード | 広告経路（QRコード） |

---

## 12. 承認事項

- [ ] データモデル変更の承認
- [ ] UI/UXデザインの承認
- [ ] 実装計画の承認

---

**作成日**: 2026-01-04
**バージョン**: 1.0
