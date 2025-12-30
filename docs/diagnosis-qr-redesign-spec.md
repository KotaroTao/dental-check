# 診断ありQRフロー再設計 仕様書 v2

## 1. 概要

### 1.1 目的
診断ありQRと診断なしQRで**完全に同じデータ取得フロー**を使い、構成をシンプルにする。

### 1.2 設計方針
- **1つの共通コンポーネント**: `ProfileForm` を診断あり・なし両方で使用
- **1つの統一API**: `/api/track/profile-complete` でプロフィール・位置情報を保存
- **スキップ廃止**: 年齢・性別・規約同意を必須化
- **Zustandストア不要**: プロフィール情報はAPIで直接保存

---

## 2. 新フロー（診断あり・なし共通）

```
QRコード読み取り
     ↓
/c/[code] (ルーティング)
     ↓
/c/[code]/profile (共通プロフィール入力ページ)
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
│  - [位置情報を許可して進む]         │
│  - [位置情報なしで進む]             │
└─────────────────────────────────────┘
     ↓
┌─────────────────────────────────────┐
│  POST /api/track/profile-complete   │
│  {                                  │
│    channelId,                       │
│    userAge, userGender,             │
│    latitude, longitude              │
│  }                                  │
│  → diagnosisSession 作成            │
│  → sessionId 発行                   │
└─────────────────────────────────────┘
     ↓
┌──────────────────┬──────────────────┐
│  診断ありQR      │  診断なしQR      │
├──────────────────┼──────────────────┤
│  診断ページへ    │  外部URLへ       │
│  遷移            │  リダイレクト    │
│  ?sessionId=xxx  │                  │
└──────────────────┴──────────────────┘
```

---

## 3. 統一API設計

### 3.1 `/api/track/profile-complete` (POST)

**リクエスト**:
```json
{
  "channelId": "string",
  "userAge": 35,
  "userGender": "male | female | other",
  "latitude": 35.6812 | null,
  "longitude": 139.7671 | null
}
```

**レスポンス**:
```json
{
  "success": true,
  "sessionId": "uuid",
  "nextAction": "diagnosis | redirect",
  "redirectUrl": "https://..." | null,
  "diagnosisPath": "/c/xxx/oral-age?sessionId=uuid" | null
}
```

**処理内容**:
1. channelIdからチャネル情報取得（channelType, diagnosisTypeSlug, redirectUrl）
2. diagnosisSession作成（sessionId発行）
3. 位置情報の逆ジオコーディング（あれば）
4. channelTypeに応じて`nextAction`を返す

### 3.2 `/api/track/diagnosis-complete` (POST)

**リクエスト**:
```json
{
  "sessionId": "uuid",
  "answers": [...],
  "totalScore": 75,
  "resultCategory": "良好",
  "oralAge": 32
}
```

**レスポンス**:
```json
{
  "success": true
}
```

### 3.3 `/api/track/cta` (POST) - 既存維持

```json
{
  "sessionId": "uuid",
  "ctaType": "booking | phone | line | ..."
}
```

---

## 4. コンポーネント設計

### 4.1 共通ProfileForm

**新ファイル**: `/src/components/common/profile-form.tsx`

```tsx
interface ProfileFormProps {
  channelId: string;
  channelName: string;
  mainColor?: string;
  // 以下はAPIレスポンスで決定するため不要
}

export function ProfileForm({ channelId, channelName, mainColor }: ProfileFormProps) {
  // ステップ1: 年齢・性別・規約同意（スキップなし）
  // ステップ2: 位置情報許可
  // 完了: POST /api/track/profile-complete
  //       → nextActionに応じてリダイレクトまたは遷移
}
```

### 4.2 削除するコンポーネント

- `/src/components/link/link-profile-form.tsx` → 削除
- `/src/components/diagnosis/diagnosis-profile-form.tsx` → 削除

### 4.3 DiagnosisFlow改修

```tsx
// sessionIdがない場合は /profile にリダイレクト
if (!sessionId) {
  router.push(`/c/${channelCode}/profile`);
  return null;
}

// sessionIdからプロフィール情報を取得（APIまたはprops経由）
// 質問表示 → 完了時にPOST /api/track/diagnosis-complete
```

---

## 5. ページ構成

### 5.1 変更前

```
/c/[code]/
  ├── route.ts        → diagnosis: /profile, link: /link へ振り分け
  ├── profile/page.tsx → DiagnosisProfileForm
  ├── link/page.tsx    → LinkProfileForm
  └── [type]/page.tsx  → DiagnosisFlow
```

### 5.2 変更後（シンプル化）

```
/c/[code]/
  ├── route.ts        → 常に /profile へリダイレクト
  ├── profile/page.tsx → 共通ProfileForm（診断あり・なし両対応）
  └── [type]/page.tsx  → DiagnosisFlow（sessionId必須）
```

- `/c/[code]/link/` → **削除**（profileページに統合）

---

## 6. データベース変更

### 6.1 diagnosisSessionテーブル

```prisma
model DiagnosisSession {
  id              String    @id @default(cuid())

  // チャネル情報
  clinicId        String
  channelId       String
  sessionType     String    // "diagnosis" | "link"

  // プロフィール（profile-complete時に保存）
  userAge         Int
  userGender      String

  // 位置情報（profile-complete時に保存）
  latitude        Float?
  longitude       Float?
  country         String?
  region          String?
  city            String?
  town            String?

  // 診断結果（diagnosis-complete時に保存、linkの場合null）
  diagnosisTypeId String?
  answers         Json?
  totalScore      Int?
  resultCategory  String?
  oralAge         Int?

  // タイムスタンプ
  startedAt       DateTime  @default(now())  // プロフィール完了時
  completedAt     DateTime?                   // 診断完了時（linkは即座に設定）

  // リレーション
  clinic          Clinic    @relation(...)
  channel         Channel   @relation(...)
}
```

---

## 7. Zustandストアの役割変更

### 7.1 変更前
- プロフィール情報（userAge, userGender, latitude, longitude）を保持
- 診断の回答・結果を保持

### 7.2 変更後
- **プロフィール情報は持たない**（APIで保存済み）
- 診断中の一時的な回答のみ保持

```typescript
interface DiagnosisStore {
  // 現在の診断セッション
  sessionId: string | null;

  // 診断進行（一時的）
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
  calculateResult: (...) => void;
  reset: () => void;
}
```

---

## 8. 実装手順

### Phase 1: API作成
1. [ ] `/api/track/profile-complete` API作成
2. [ ] `/api/track/diagnosis-complete` API作成（既存completeを改修）
3. [ ] Prismaスキーマ更新（startedAt追加）

### Phase 2: コンポーネント作成
4. [ ] 共通 `ProfileForm` 作成
5. [ ] `/c/[code]/profile/page.tsx` 改修（共通ProfileForm使用）
6. [ ] `/c/[code]/link/` ページ削除
7. [ ] `/c/[code]/route.ts` 改修（常にprofileへ）

### Phase 3: 診断フロー改修
8. [ ] `DiagnosisFlow` 改修（sessionId必須化）
9. [ ] `ResultCard` 改修（sessionIdベース）
10. [ ] Zustandストア簡略化

### Phase 4: クリーンアップ
11. [ ] 旧コンポーネント削除（LinkProfileForm, DiagnosisProfileForm）
12. [ ] 旧API削除（link-complete）
13. [ ] テスト

---

## 9. 削除対象一覧

| ファイル/コード | 理由 |
|----------------|------|
| `/src/components/link/link-profile-form.tsx` | 共通ProfileFormに統合 |
| `/src/components/diagnosis/diagnosis-profile-form.tsx` | 共通ProfileFormに統合 |
| `/src/app/c/[code]/link/page.tsx` | profileページに統合 |
| `/api/track/link-complete` | profile-completeに統合 |
| Zustandのプロフィール関連state | API保存に変更 |
| 「スキップして進む」ボタン | 必須化により不要 |

---

## 10. フロー比較

### 変更前
```
診断ありQR: /profile → DiagnosisProfileForm → Zustand保存 → /[type] → 診断 → /api/track/complete
診断なしQR: /link → LinkProfileForm → /api/track/link-complete → 外部URL
```

### 変更後
```
診断ありQR: /profile → ProfileForm → /api/track/profile-complete → /[type]?sessionId → 診断 → /api/track/diagnosis-complete
診断なしQR: /profile → ProfileForm → /api/track/profile-complete → 外部URL
                            ↑ 同じ ↑
```

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|-----|-----------|---------|
| 2025-12-30 | 1.0 | 初版作成 |
| 2025-12-30 | 2.0 | 構成をシンプル化、共通ProfileForm設計 |
