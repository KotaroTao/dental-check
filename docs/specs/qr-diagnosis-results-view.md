# QRコード別診断結果閲覧機能 仕様書

## 概要

各QRコード（チャンネル）に紐づく診断結果を一覧表示し、詳細を確認できる機能。
歯科医院が患者の診断傾向を把握し、マーケティングやサービス改善に活用できる。

## 現状分析

### 既存データモデル（DiagnosisSession）

```prisma
model DiagnosisSession {
  id              String    @id
  clinicId        String?
  channelId       String?
  diagnosisTypeId String?

  // ユーザー情報 ✅ 既存
  userAge         Int?
  userGender      String?   // male/female/other

  // 位置情報 ✅ 既存
  region          String?   // 都道府県
  city            String?   // 市区町村
  town            String?   // 町丁目

  // 診断結果 ✅ 既存
  answers         Json?     // 回答データ
  totalScore      Int?      // スコア合計
  resultCategory  String?   // 結果カテゴリ（要注意/注意/良好 等）

  // タイムスタンプ ✅ 既存
  createdAt       DateTime
  completedAt     DateTime?
}
```

**✅ 必要なフィールドは全て存在** - マイグレーション不要

### 既存API（/api/dashboard/history）

既に以下を実装済み：
- `channelId` フィルター
- 期間フィルター（today/week/month/custom）
- ページネーション
- CTAクリック情報
- 地域情報（region/city/town）

**不足している項目**:
- `totalScore` がレスポンスに含まれていない
- `resultCategory` がレスポンスに含まれていない（DBには保存済み）
- 性別・年齢層フィルターなし
- 集計サマリーなし

## 機能要件

### 1. QRコード詳細ページに「診断結果」タブを追加

**場所**: `/dashboard/channels/[id]`

| タブ | 内容 |
|------|------|
| QRコード | 既存のQRコード表示・ダウンロード・埋め込みHTML |
| 診断結果 | **新規追加** - 診断結果一覧 |

### 2. 診断結果一覧の表示項目

| 項目 | DBフィールド | 既存 | ソート |
|------|-------------|------|--------|
| 日時 | `completedAt` | ✅ | ✅ |
| 年齢 | `userAge` | ✅ | ✅ |
| 性別 | `userGender` | ✅ | ✅ |
| 地域 | `region` + `city` + `town` | ✅ | - |
| スコア | `totalScore` | ✅ 保存済 | ✅ |
| 結果 | `resultCategory` | ✅ 保存済 | ✅ |
| CTAクリック | `ctaClicks` リレーション | ✅ | ✅ |

### 3. フィルター機能

| フィルター | 選択肢 | 既存API対応 |
|------------|--------|-------------|
| 期間 | 今日/1週間/1ヶ月/カスタム | ✅ 対応済み |
| 性別 | 全て/男性/女性/その他 | ❌ 追加必要 |
| 年齢層 | 全て/~19歳/20-29歳/30-39歳/40-49歳/50-59歳/60歳~ | ❌ 追加必要 |
| 結果カテゴリ | 全て/各カテゴリ | ❌ 追加必要 |
| CTAクリック | 全て/あり/なし | ❌ 追加必要 |

### 4. 集計サマリー

一覧の上部に表示：

```
診断完了: 125件 | 平均スコア: 42.5点 | CTAクリック率: 18.4%
```

### 5. CSVエクスポート

スタンダードプラン以上で利用可能

## 実装方針

### 方針A: 既存history APIを拡張（推奨）

**メリット**: コード重複を避けられる、保守性が高い

**変更内容**:
1. `/api/dashboard/history/route.ts` に以下を追加:
   - レスポンスに `totalScore`, `resultCategory` を追加
   - 性別・年齢層・結果カテゴリフィルター
   - 集計サマリー（オプションパラメータで取得）

2. `/dashboard/channels/[id]/page.tsx` にタブUIを追加

### 方針B: 新規専用APIを作成

**メリット**: 既存機能への影響なし

**デメリット**: コード重複、保守コスト増

→ **方針Aを採用**

## API設計（方針A: 既存API拡張）

### GET `/api/dashboard/history` 拡張

**追加パラメータ**:

| パラメータ | 型 | 説明 |
|------------|-----|------|
| gender | string | male/female/other |
| ageRange | string | ~19/20-29/30-39/40-49/50-59/60~ |
| resultCategory | string | 結果カテゴリ |
| hasCta | string | true/false |
| includeSummary | string | true でサマリーを含める |

**レスポンス拡張**:

```json
{
  "history": [
    {
      "id": "uuid",
      "type": "diagnosis",
      "createdAt": "2025-12-31T10:00:00Z",
      "userAge": 35,
      "userGender": "女性",
      "area": "兵庫県 西宮市 松園町7丁目",
      "totalScore": 45,           // ← 追加
      "resultCategory": "良好",   // ← 追加
      "diagnosisType": "お口年齢診断",
      "channelName": "店頭QR",
      "channelId": "uuid",
      "ctaType": "予約クリック",
      "ctaClickCount": 1
    }
  ],
  "summary": {                    // ← 追加（includeSummary=true時）
    "total": 125,
    "averageScore": 42.5,
    "ctaRate": 18.4,
    "genderDistribution": {
      "male": 45,
      "female": 72,
      "other": 8
    },
    "ageDistribution": {
      "~19": 5,
      "20-29": 22,
      "30-39": 38,
      "40-49": 35,
      "50-59": 18,
      "60~": 7
    },
    "resultDistribution": {
      "優秀": 15,
      "良好": 45,
      "やや注意": 35,
      "注意": 20,
      "要注意": 10
    }
  },
  "totalCount": 125,
  "hasMore": true
}
```

### GET `/api/dashboard/history/export`

CSVエクスポート用エンドポイント（スタンダードプラン以上）

## UI設計

### ページレイアウト

```
┌─────────────────────────────────────────────────────┐
│ ← ダッシュボードに戻る                              │
├─────────────────────────────────────────────────────┤
│ [QRコード名]                          [編集] [有効] │
│ 診断タイプ: お口年齢診断                           │
├─────────────────────────────────────────────────────┤
│ [QRコード] [診断結果]  ← タブ切り替え              │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ┌─ フィルター ─────────────────────────────────┐   │
│ │ 期間: [1ヶ月 ▼] 性別: [全て ▼] 年齢: [全て ▼]│   │
│ └───────────────────────────────────────────────┘   │
│                                                     │
│ 診断完了: 125件 | 平均スコア: 42.5点 | CTA率: 18.4% │
│                                   [CSVエクスポート] │
│                                                     │
│ ┌──────────────────────────────────────────────────┐│
│ │ 日時       │年齢│性別│ 地域    │スコア│結果 │CTA││
│ ├────────────┼────┼────┼─────────┼──────┼─────┼───┤│
│ │12/31 10:00 │ 35 │女性│ 西宮市  │ 45点 │良好 │ ✓ ││
│ │12/31 09:30 │ 42 │男性│ 大阪市  │ 38点 │注意 │ - ││
│ └──────────────────────────────────────────────────┘│
│                                                     │
│              [もっと見る]                           │
└─────────────────────────────────────────────────────┘
```

## 実装フェーズ

### Phase 1: API拡張（0.5日）

1. `/api/dashboard/history/route.ts` 修正
   - レスポンスに `totalScore`, `resultCategory` を追加
   - 新規フィルターパラメータ対応（gender, ageRange, resultCategory, hasCta）
   - サマリー計算・返却（includeSummary=true時）

### Phase 2: フロントエンド（1日）

1. `/dashboard/channels/[id]/page.tsx` にタブUI追加
2. 診断結果一覧コンポーネント作成
3. フィルターUI実装
4. サマリー表示

### Phase 3: CSVエクスポート（0.5日）

1. `/api/dashboard/history/export` エンドポイント追加
2. プラン制限チェック

## 注意事項

### プライバシー

- 個人を特定できる情報は表示しない
- 位置情報は町丁目レベルまで
- データは医院管理者のみアクセス可能

### パフォーマンス

- 大量データ対応のためページネーション必須
- サマリー計算はDBで実行（クライアント側で集計しない）
- 既存インデックス: `[clinicId, completedAt, isDemo, createdAt]`

## 関連ファイル

| ファイル | 変更内容 |
|----------|----------|
| `/src/app/api/dashboard/history/route.ts` | フィルター・サマリー追加、totalScore/resultCategory返却 |
| `/src/app/dashboard/channels/[id]/page.tsx` | タブUI追加 |
| `/src/components/dashboard/results-tab.tsx` | 新規作成（診断結果タブコンポーネント） |
| `/prisma/schema.prisma` | **変更なし**（必要フィールド既存） |
| `/src/components/diagnosis/result-card.tsx` | **変更なし**（既にtotalScore/resultCategory送信済み） |
| `/src/app/api/track/complete/route.ts` | **変更なし**（既にtotalScore/resultCategory保存済み） |
