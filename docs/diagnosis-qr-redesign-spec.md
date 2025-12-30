# 診断ありQRフロー再設計 仕様書

## 1. 概要

### 1.1 目的
診断ありQR（`channelType: "diagnosis"`）のフローを、診断なしQR（`channelType: "link"`）と完全に統一する。ユーザーは最初に必ず年齢・性別・GPS許可を行ってから診断を開始する。

### 1.2 現状の問題点

| 項目 | 診断なしQR (LinkProfileForm) | 診断ありQR (現状) |
|------|------------------------------|------------------|
| プロフィール入力 | 必須（最初に実行） | オプション（スキップ可能） |
| 位置情報許可 | 明示的なステップ2で実施 | ProfileForm内で曖昧に実施 |
| データ保存 | API経由で即座に保存 | Zustandストア → 診断完了時に保存 |
| フローの一貫性 | シンプルで明確 | 複雑（profileページ + 診断ページ内ProfileForm） |

### 1.3 目標
- 診断ありQRでも年齢・性別・GPS許可を**必須ステップ**として最初に実行
- 「スキップして診断を始める」オプションを**削除**
- 診断開始時点でプロフィール情報が確定している状態にする
- 診断完了・CTA計測の仕組みをシンプルに再設計

---

## 2. 新フロー設計

### 2.1 ユーザーフロー（診断ありQR）

```
QRコード読み取り
     ↓
/c/[code] (ルーティング)
     ↓ channelType === "diagnosis"
/c/[code]/profile (プロフィール入力ページ)
     ↓
┌─────────────────────────────────────┐
│  ステップ1: プロフィール入力        │
│  - 年齢（必須）                     │
│  - 性別（必須）                     │
│  - 利用規約同意（必須）             │
│  [次へ]                             │
└─────────────────────────────────────┘
     ↓
┌─────────────────────────────────────┐
│  ステップ2: 位置情報許可            │
│  - 位置情報のご協力のお願い         │
│  - [位置情報を許可して診断を開始]   │
│  - [位置情報なしで診断を開始]       │
└─────────────────────────────────────┘
     ↓
┌─────────────────────────────────────┐
│  診断開始イベント記録 (API)         │
│  POST /api/track/diagnosis-start    │
│  - channelId, diagnosisType         │
│  - userAge, userGender              │
│  - latitude, longitude              │
│  → diagnosisSession 作成            │
│  → sessionId 発行                   │
└─────────────────────────────────────┘
     ↓
/c/[code]/[diagnosisTypeSlug]?sessionId=xxx (診断ページ)
     ↓
┌─────────────────────────────────────┐
│  質問1〜10を順次表示                │
│  - QuestionCard                     │
│  - 回答選択 → 次へ                  │
└─────────────────────────────────────┘
     ↓
┌─────────────────────────────────────┐
│  診断完了イベント記録 (API)         │
│  POST /api/track/diagnosis-complete │
│  - sessionId                        │
│  - answers, totalScore              │
│  - resultCategory                   │
│  → diagnosisSession 更新            │
└─────────────────────────────────────┘
     ↓
┌─────────────────────────────────────┐
│  結果表示 (ResultCard)              │
│  - 診断結果                         │
│  - ClinicCTA（予約/電話/LINE等）    │
└─────────────────────────────────────┘
     ↓
┌─────────────────────────────────────┐
│  CTAクリック記録 (API)              │
│  POST /api/track/cta                │
│  - sessionId, ctaType               │
│  → cTAClick 記録                    │
└─────────────────────────────────────┘
```

### 2.2 診断なしQRとの比較（統一後）

| ステップ | 診断なしQR | 診断ありQR（新） |
|---------|-----------|-----------------|
| 1. プロフィール入力 | 年齢・性別・規約同意 | 年齢・性別・規約同意 |
| 2. 位置情報許可 | GPS許可/スキップ | GPS許可/スキップ |
| 3. データ記録 | link-complete API | diagnosis-start API |
| 4. 遷移先 | 外部URL | 診断ページ |
| 5. 完了時 | - | diagnosis-complete API |
| 6. CTAクリック | - | cta API |

---

## 3. API設計

### 3.1 新規API: 診断開始 `/api/track/diagnosis-start`

**目的**: 診断開始時にセッションを作成し、プロフィール・位置情報を記録

**リクエスト (POST)**:
```json
{
  "channelId": "string",
  "diagnosisType": "string (slug)",
  "userAge": "number",
  "userGender": "male | female | other",
  "latitude": "number | null",
  "longitude": "number | null"
}
```

**レスポンス**:
```json
{
  "success": true,
  "sessionId": "string (UUID)",
  "diagnosisType": "string (slug)"
}
```

**処理内容**:
1. channelId の検証（存在確認、有効期限チェック）
2. サブスクリプション確認（有効な場合のみ記録）
3. `diagnosisSession` レコード作成
   - sessionType: "diagnosis"
   - isDemo: false
   - startedAt: 現在時刻
   - completedAt: null（未完了）
4. 位置情報の逆ジオコーディング（latitude, longitudeがある場合）
5. sessionId を返却

**データベース変更**:
- `diagnosisSession` テーブルに `startedAt` カラム追加
- `sessionId` (UUID) を主キーとして使用

### 3.2 既存API変更: 診断完了 `/api/track/diagnosis-complete`

**目的**: 診断完了時に回答・スコア・結果カテゴリを更新

**リクエスト (POST)**:
```json
{
  "sessionId": "string (UUID)",
  "answers": [
    { "questionId": "string", "optionIndex": "number", "score": "number" }
  ],
  "totalScore": "number",
  "resultCategory": "string",
  "oralAge": "number | null"
}
```

**レスポンス**:
```json
{
  "success": true
}
```

**処理内容**:
1. sessionId の検証
2. `diagnosisSession` レコード更新
   - answers: JSON形式で保存
   - totalScore
   - resultCategory
   - oralAge（お口年齢診断の場合）
   - completedAt: 現在時刻

### 3.3 既存API変更: CTAクリック `/api/track/cta`

**リクエスト (POST)**:
```json
{
  "sessionId": "string (UUID)",
  "ctaType": "string",
  "diagnosisType": "string"
}
```

**処理内容**:
1. sessionId から channelId, clinicId を取得
2. `cTAClick` レコード作成

---

## 4. コンポーネント設計

### 4.1 DiagnosisProfileForm（大幅改修）

**ファイル**: `/src/components/diagnosis/diagnosis-profile-form.tsx`

**変更点**:
- 「スキップして診断を始める」ボタンを**削除**
- LinkProfileForm と同じUI/UXに統一
- ステップ2完了時に `POST /api/track/diagnosis-start` を呼び出し
- レスポンスの `sessionId` をクエリパラメータとして診断ページに渡す

**新しいステップ**:

```tsx
// ステップ1: プロフィール入力
<div>
  <Input label="年齢" type="number" required />
  <Select label="性別" options={["男性", "女性", "回答しない"]} required />
  <Checkbox label="利用規約に同意する" required />
  <Button onClick={goToStep2}>次へ</Button>
</div>

// ステップ2: 位置情報許可
<LocationConsentCard
  onAllow={handleLocationAllow}
  onSkip={handleLocationSkip}
/>
```

### 4.2 DiagnosisFlow（改修）

**ファイル**: `/src/components/diagnosis/diagnosis-flow.tsx`

**変更点**:
- `ProfileForm` 表示ロジックを**削除**（プロフィール入力は /profile ページで完了済み）
- `sessionId` をURLクエリパラメータから取得
- 診断完了時に `POST /api/track/diagnosis-complete` を呼び出し
- Zustandストアの役割を簡略化（回答の一時保存のみ）

**新しいフロー**:
```tsx
// sessionIdがない場合は /profile にリダイレクト
if (!sessionId) {
  router.push(`/c/${channelCode}/profile`);
  return null;
}

// 質問表示
if (currentStep < questions.length) {
  return <QuestionCard ... />;
}

// 結果表示（診断完了時にAPI呼び出し済み）
return <ResultCard sessionId={sessionId} ... />;
```

### 4.3 ResultCard（改修）

**ファイル**: `/src/components/diagnosis/result-card.tsx`

**変更点**:
- 診断完了トラッキングのロジックを簡略化
- `sessionId` を受け取り、CTAクリック時に使用
- useEffectでの複雑なトラッキングを削除（診断完了はDiagnosisFlowで処理済み）

### 4.4 LocationConsentCard（新規/共通化）

**ファイル**: `/src/components/common/location-consent-card.tsx`

**目的**: 位置情報許可UIを診断ありQR・診断なしQRで共通化

**Props**:
```tsx
interface LocationConsentCardProps {
  onAllow: (coords: { latitude: number; longitude: number }) => void;
  onSkip: () => void;
  allowButtonText?: string; // デフォルト: "位置情報を許可して進む"
  skipButtonText?: string;  // デフォルト: "位置情報なしで進む"
}
```

---

## 5. Zustandストア設計

### 5.1 診断ストア（簡略化）

**ファイル**: `/src/lib/diagnosis-store.ts`

**変更後の役割**:
- 診断中の**一時的な回答保存のみ**
- プロフィール情報はAPIで保存済みなのでストアに持たない
- sessionIdを保持

**新しい状態**:
```typescript
interface DiagnosisStore {
  // セッション情報（APIから取得）
  sessionId: string | null;

  // 診断進行状態
  currentStep: number;
  answers: Answer[];
  selectedIndex: number | null;

  // 結果
  totalScore: number | null;
  resultPattern: ResultPattern | null;
  oralAge: number | null;

  // アクション
  setSessionId: (id: string) => void;
  setAnswer: (answer: Answer) => void;
  nextStep: () => void;
  calculateResult: (diagnosisType: DiagnosisType, userAge: number) => void;
  reset: () => void;
}
```

**削除する状態**:
- `userAge`, `userGender` → APIで管理
- `locationConsent`, `latitude`, `longitude` → APIで管理
- `setProfile`, `setLocation` → 不要

---

## 6. データベース変更

### 6.1 diagnosisSession テーブル変更

**追加カラム**:
```sql
ALTER TABLE "diagnosisSession" ADD COLUMN "startedAt" TIMESTAMP;
```

**移行手順**:
1. Prismaスキーマ更新
2. マイグレーション実行
3. 既存データは `startedAt = completedAt` として更新（後方互換性）

### 6.2 スキーマ定義（更新後）

```prisma
model DiagnosisSession {
  id                String    @id @default(cuid())
  clinicId          String
  channelId         String?
  diagnosisTypeId   String?
  sessionType       String    @default("diagnosis") // "diagnosis" | "link"
  isDemo            Boolean   @default(false)

  // プロフィール情報
  userAge           Int?
  userGender        String?

  // 診断結果
  answers           Json?
  totalScore        Int?
  resultCategory    String?
  oralAge           Int?

  // タイムスタンプ
  startedAt         DateTime? // NEW: 診断開始時刻
  completedAt       DateTime? // 診断完了時刻
  createdAt         DateTime  @default(now())

  // 位置情報
  ipAddress         String?
  latitude          Float?
  longitude         Float?
  country           String?
  region            String?
  city              String?
  town              String?

  // リレーション
  clinic            Clinic    @relation(fields: [clinicId], references: [id])
  channel           Channel?  @relation(fields: [channelId], references: [id])
  diagnosisType     DiagnosisType? @relation(fields: [diagnosisTypeId], references: [id])
  ctaClicks         CTAClick[]
}
```

---

## 7. 計測設計

### 7.1 計測ポイント一覧

| イベント | タイミング | API | 記録内容 |
|---------|-----------|-----|---------|
| ページアクセス | 診断ページ表示時 | `/api/track/access` | チャネル、診断タイプ、UA、リファラ |
| 診断開始 | プロフィール入力完了時 | `/api/track/diagnosis-start` | プロフィール、位置情報 |
| 診断完了 | 全質問回答後 | `/api/track/diagnosis-complete` | 回答、スコア、結果 |
| CTAクリック | CTAボタンクリック時 | `/api/track/cta` | CTAタイプ |

### 7.2 ファネル分析

新設計により以下のファネル分析が可能:

```
1. ページアクセス数 (accessLog)
   ↓
2. 診断開始数 (diagnosisSession WHERE startedAt IS NOT NULL)
   ↓
3. 診断完了数 (diagnosisSession WHERE completedAt IS NOT NULL)
   ↓
4. CTAクリック数 (cTAClick)
```

**離脱率計算**:
- プロフィール入力離脱率 = 1 - (診断開始数 / ページアクセス数)
- 診断途中離脱率 = 1 - (診断完了数 / 診断開始数)
- CTA転換率 = CTAクリック数 / 診断完了数

---

## 8. 実装手順

### Phase 1: データベース・API準備
1. [ ] Prismaスキーマに `startedAt` カラム追加
2. [ ] マイグレーション実行
3. [ ] `/api/track/diagnosis-start` API作成
4. [ ] `/api/track/diagnosis-complete` API改修（既存 `/api/track/complete` をリネーム）

### Phase 2: コンポーネント改修
5. [ ] `LocationConsentCard` 共通コンポーネント作成
6. [ ] `DiagnosisProfileForm` 改修（スキップ削除、API呼び出し追加）
7. [ ] `LinkProfileForm` を `LocationConsentCard` 使用に更新
8. [ ] `DiagnosisFlow` 改修（ProfileForm削除、sessionId対応）

### Phase 3: ストア・結果画面改修
9. [ ] `diagnosis-store.ts` 簡略化
10. [ ] `ResultCard` 改修（sessionId対応）

### Phase 4: テスト・検証
11. [ ] E2Eテスト追加（診断ありQRフロー）
12. [ ] 既存テスト修正
13. [ ] 動作検証（QRスキャン → 診断完了 → CTA）

---

## 9. 後方互換性

### 9.1 既存データへの影響
- 既存の `diagnosisSession` レコードは `startedAt = NULL` のまま
- ダッシュボードの分析クエリは `startedAt IS NULL` を考慮

### 9.2 移行期間中の対応
- 新APIと旧APIを並行稼働（2週間）
- 旧フローからのアクセスも受け付ける
- ログ監視で旧フローの使用状況を確認

---

## 10. セキュリティ考慮事項

### 10.1 sessionId の保護
- sessionId は推測困難なUUID v4を使用
- sessionId はURLクエリパラメータとして渡すが、HTTPS通信で保護
- sessionId の有効期限は24時間（それ以降は診断完了不可）

### 10.2 不正リクエスト対策
- diagnosis-complete は対応する diagnosis-start がないと失敗
- 同一sessionId での重複完了リクエストは無視
- channelIdとsessionIdの紐付けを検証

---

## 11. 削除対象

### 11.1 削除するコード
- `DiagnosisProfileForm` の「スキップして診断を始める」ボタン
- `DiagnosisFlow` 内の `ProfileForm` 表示ロジック
- `diagnosis-store.ts` の `userAge`, `userGender`, `locationConsent`, `latitude`, `longitude`
- `/api/track/complete` （`/api/track/diagnosis-complete` にリネーム）

### 11.2 削除しないコード
- デモモード (`/demo/[type]`) のフロー（ProflieFormを残す）
- 埋め込みモード (`/embed/[slug]/[type]`) のフロー

---

## 12. 今後の拡張性

この設計により以下の拡張が容易になる:

1. **診断途中保存・再開機能**: sessionIdベースで途中状態を保存可能
2. **A/Bテスト**: プロフィール入力UIのバリエーションテスト
3. **詳細なファネル分析**: 各ステップの離脱率を正確に計測
4. **プロフィール事前入力**: LINEログイン等で年齢・性別を自動入力

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|-----|-----------|---------|
| 2025-12-30 | 1.0 | 初版作成 |
