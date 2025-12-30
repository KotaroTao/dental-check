# 診断なしQRコード プロファイル情報記録機能 仕様書

## 概要

診断なしQRコード（linkタイプ）でも、診断ありQRコードと同じ形式で年齢・性別・位置情報を記録する機能。

リダイレクト前に簡易プロファイル入力ページを表示し、ユーザー情報を取得してから外部URLへリダイレクトする。

## 現状の課題

| 項目 | 診断ありQR | 診断なしQR |
|------|-----------|-----------|
| 年齢 | ✅ DiagnosisSession.userAge | ❌ 未記録 |
| 性別 | ✅ DiagnosisSession.userGender | ❌ 未記録 |
| 位置情報 | ✅ GPS（高精度） | ⚠️ IPベースのみ（低精度） |
| 保存先 | DiagnosisSession | AccessLog + scanCount |

**問題**: linkタイプは即座にリダイレクトするため、プロファイル情報を取得する機会がない。

## 解決方針

診断なしQRでも「簡易プロファイル入力ページ」を経由させ、同じ `DiagnosisSession` テーブルに記録する。

### フロー変更

```
【変更前】
/c/{code} → 即座に外部URLへリダイレクト

【変更後】
/c/{code} → /c/{code}/link（プロファイル入力）→ セッション作成 → 外部URLへリダイレクト
```

## データモデル変更

### 1. DiagnosisSession に sessionType 追加

```prisma
model DiagnosisSession {
  // 既存フィールド...

  // 新規フィールド
  sessionType     String    @default("diagnosis") @map("session_type")  // "diagnosis" | "link"

  // diagnosisTypeId を nullable に変更
  diagnosisTypeId String?   @map("diagnosis_type_id")  // linkタイプはnull
}
```

### 2. マイグレーション

```sql
-- sessionType カラム追加
ALTER TABLE diagnosis_sessions ADD COLUMN session_type VARCHAR(20) DEFAULT 'diagnosis';

-- diagnosisTypeId を nullable に
ALTER TABLE diagnosis_sessions ALTER COLUMN diagnosis_type_id DROP NOT NULL;

-- インデックス追加
CREATE INDEX idx_diagnosis_sessions_session_type ON diagnosis_sessions(clinic_id, session_type);
```

## 新規ページ実装

### `/c/[code]/link/page.tsx`

簡易プロファイル入力ページ。既存の `profile-form.tsx` を簡略化して再利用。

#### UI構成

```
┌─────────────────────────────────────────┐
│ [医院ロゴ] 医院名                         │
├─────────────────────────────────────────┤
│                                         │
│       🎁 特典ページへご案内します          │
│                                         │
│  簡単なアンケートにご協力ください           │
│                                         │
│  年齢                                   │
│  ┌─────────────────────────────────────┐│
│  │ ▼ 選択してください                   ││
│  └─────────────────────────────────────┘│
│                                         │
│  性別                                   │
│  ┌─────────────┐ ┌─────────────┐        │
│  │ ○ 男性      │ │ ○ 女性      │        │
│  └─────────────┘ └─────────────┘        │
│  ┌─────────────────────────────────────┐│
│  │         ○ 回答しない                ││
│  └─────────────────────────────────────┘│
│                                         │
│  □ 利用規約に同意する                     │
│    ※チェックで位置情報許可リクエスト       │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │           進む →                    ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │      スキップして進む                ││
│  └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

#### 処理フロー

1. ユーザーがプロファイル入力（任意）
2. 利用規約チェックで位置情報許可をリクエスト
3. 「進む」ボタンクリック
4. `/api/track/link-complete` にデータ送信
5. DiagnosisSession 作成（sessionType: "link"）
6. 外部URLへリダイレクト

#### スキップ機能

- 「スキップして進む」ボタンで入力をスキップ可能
- スキップ時もセッションは作成（プロファイル情報はnull）
- 位置情報は取得しない

## API実装

### POST `/api/track/link-complete`

リンクタイプのセッション完了を記録するAPI。

#### リクエスト

```typescript
interface LinkCompleteRequest {
  channelId: string;
  userAge?: number | null;
  userGender?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}
```

#### レスポンス

```typescript
interface LinkCompleteResponse {
  success: boolean;
  sessionId: string | null;
  redirectUrl: string;  // リダイレクト先URL
}
```

#### 処理内容

1. チャンネル情報取得
2. サブスクリプション状態チェック
3. DiagnosisSession 作成
   - sessionType: "link"
   - diagnosisTypeId: null
   - userAge, userGender: リクエスト値
4. 位置情報がある場合は逆ジオコーディング実行
5. AccessLog も同時に作成（既存の qr_scan イベント）
6. scanCount インクリメント
7. redirectUrl を返却

## route.ts 変更

### `/c/[code]/route.ts`

```typescript
// linkタイプの場合
if (channel.channelType === "link" && channel.redirectUrl) {
  // 従来: 即座にリダイレクト
  // 変更: プロファイル入力ページへ
  return NextResponse.redirect(new URL(`/c/${code}/link`, request.url));
}
```

## ダッシュボード対応

### 統計表示

既存のダッシュボード統計クエリに `sessionType` フィルタを追加。

```typescript
// 診断完了数（診断タイプのみ）
const diagnosisCount = await prisma.diagnosisSession.count({
  where: {
    clinicId,
    sessionType: "diagnosis",
    completedAt: { not: null },
  },
});

// リンクスキャン数
const linkScanCount = await prisma.diagnosisSession.count({
  where: {
    clinicId,
    sessionType: "link",
  },
});
```

### 地図表示

`sessionType` に関係なく位置情報を集計（統合表示）。

## 実装ファイル一覧

| ファイル | 変更種別 | 内容 |
|----------|---------|------|
| `prisma/schema.prisma` | 変更 | sessionType追加、diagnosisTypeId nullable化 |
| `src/app/c/[code]/route.ts` | 変更 | linkタイプのリダイレクト先変更 |
| `src/app/c/[code]/link/page.tsx` | 新規 | プロファイル入力ページ |
| `src/components/link/link-profile-form.tsx` | 新規 | プロファイル入力フォーム |
| `src/app/api/track/link-complete/route.ts` | 新規 | リンク完了API |

## テスト項目

1. [ ] linkタイプQRスキャン → プロファイルページ表示
2. [ ] プロファイル入力 → セッション作成 → リダイレクト
3. [ ] スキップ → セッション作成（null値）→ リダイレクト
4. [ ] 位置情報許可 → GPS座標取得 → 逆ジオコーディング
5. [ ] 位置情報拒否 → 位置情報なしでセッション作成
6. [ ] 有効期限切れ → 期限切れページ表示
7. [ ] ダッシュボード統計に反映確認

## プライバシー考慮

- 位置情報は利用規約同意時のみリクエスト
- GPS座標は保存しない（逆ジオコーディング後に破棄）
- 保存するのは都道府県・市区町村・町丁目名のみ
- スキップ機能で強制しない設計

## 見積もり工数

| 項目 | 工数 |
|------|------|
| スキーマ変更・マイグレーション | 30分 |
| プロファイル入力ページ | 1時間 |
| API実装 | 30分 |
| route.ts変更 | 15分 |
| テスト | 30分 |
| **合計** | **約3時間** |
