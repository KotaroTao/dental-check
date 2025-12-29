# QRコードリンク機能（診断なし）仕様書

## 概要

診断コンテンツを経由せず、QRコードから直接任意のURLへリダイレクトする機能。
QRコードのスキャン回数をCTAとしてカウントし、マーケティング効果を測定可能にする。

## 現状の課題

現在のChannel（QRコード）は必ず診断タイプ（`diagnosisTypeSlug`）と紐づいており、
診断なしのリンク用途には対応していない。

## 機能要件

### 1. チャネルタイプの追加

チャネルに2つのタイプを設ける：

| タイプ | 説明 | リンク先 |
|--------|------|----------|
| `diagnosis` | 診断付き（現行） | `/c/{code}/{diagnosisType}` → 診断フロー |
| `link` | リンクのみ | `/c/{code}` → 任意URL |

### 2. データモデル変更

```prisma
model Channel {
  // 既存フィールド
  id                String   @id @default(uuid())
  clinicId          String   @map("clinic_id")
  code              String   @unique
  name              String
  description       String?
  imageUrl          String?  @map("image_url")
  sortOrder         Int      @default(0)
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // 変更フィールド
  channelType       String   @default("diagnosis") @map("channel_type")  // "diagnosis" | "link"
  diagnosisTypeSlug String?  @map("diagnosis_type_slug")  // NULLable に変更

  // 新規フィールド
  redirectUrl       String?  @map("redirect_url")  // リンクタイプ用のリダイレクト先URL

  // リレーション
  clinic     Clinic             @relation(fields: [clinicId], references: [id])
  sessions   DiagnosisSession[]
  accessLogs AccessLog[]
  ctaClicks  CTAClick[]
  scanLogs   ScanLog[]          // 新規: スキャンログ
}

// 新規モデル: QRコードスキャン記録
model ScanLog {
  id        String   @id @default(uuid())
  channelId String   @map("channel_id")
  ipAddress String?  @map("ip_address")
  userAgent String?  @map("user_agent")
  referer   String?
  country   String?
  region    String?
  city      String?
  createdAt DateTime @default(now()) @map("created_at")

  channel   Channel  @relation(fields: [channelId], references: [id])

  @@index([channelId, createdAt])
  @@map("scan_logs")
}
```

### 3. URL構造

| タイプ | QRコードURL | 動作 |
|--------|-------------|------|
| diagnosis | `/c/{code}/{type}` | 診断フローへ（現行通り） |
| link | `/c/{code}` | スキャン記録 → `redirectUrl`へリダイレクト |

### 4. スキャン記録フロー

```
1. ユーザーがQRコードをスキャン
   ↓
2. /c/{code} にアクセス
   ↓
3. チャネルタイプを判定
   ↓
4. linkタイプの場合:
   a. ScanLogを作成（IP、UserAgent、位置情報）
   b. redirectUrlへ302リダイレクト
   ↓
5. diagnosisタイプの場合:
   a. 現行通り診断フローへ
```

### 5. ダッシュボード表示

#### チャネル一覧
- タイプ別のバッジ表示（「診断」「リンク」）
- リンクタイプはスキャン数を表示

#### チャネル詳細
- **診断タイプ**: 現行通り（診断完了数、CTA数など）
- **リンクタイプ**:
  - スキャン総数
  - 日別スキャン推移グラフ
  - 地域別スキャン分布

### 6. API エンドポイント

#### 既存変更
- `POST /api/channels` - channelType, redirectUrl対応
- `PUT /api/channels/[id]` - 同上

#### 新規
- `GET /api/dashboard/scans?channelId={id}` - スキャン統計取得

---

## 改善提案

### 優先度: 高

#### 1. UTMパラメータ自動付与
リダイレクト時にUTMパラメータを自動付与し、Google Analyticsとの連携を強化。

```
redirectUrl: https://example.com/page
実際のリダイレクト: https://example.com/page?utm_source=qr&utm_medium=offline&utm_campaign={channelName}
```

**メリット**: 歯科医院側のGA4でも効果測定可能

#### 2. リダイレクトURL検証
- URL形式バリデーション
- 危険なドメイン（フィッシングサイト等）のブロックリスト
- HTTPSのみ許可オプション

**理由**: セキュリティリスク軽減

#### 3. スキャン重複除去オプション
同一IPからの短時間内の複数スキャンを1回としてカウントするオプション。

```prisma
model Channel {
  // ...
  dedupeWindow  Int?  @default(3600)  // 重複除去ウィンドウ（秒）、NULLで無効
}
```

**理由**: 意図しない複数スキャン（QRリーダーのプレビュー等）を除外

### 優先度: 中

#### 4. 短縮URL対応
リダイレクト先URLが長い場合のQRコード可読性向上。
内部的に短縮URLを生成・管理。

#### 5. スキャン通知
設定した閾値を超えた場合にメール/LINE通知。

```
例: 「本日のスキャン数が100件を超えました」
```

#### 6. A/Bテスト機能
同一チャネルで複数のリダイレクト先を設定し、ランダムに振り分け。
どのURLが効果的かを測定。

```prisma
model ChannelVariant {
  id          String  @id @default(uuid())
  channelId   String
  redirectUrl String
  weight      Int     @default(1)  // 振り分け比率
  scanCount   Int     @default(0)

  channel     Channel @relation(fields: [channelId], references: [id])
}
```

#### 7. 有効期限設定
チャネルに有効期限を設定し、期限切れ後は専用ページへリダイレクト。

```prisma
model Channel {
  // ...
  expiresAt     DateTime?  @map("expires_at")
  expiredUrl    String?    @map("expired_url")  // 期限切れ時のリダイレクト先
}
```

**ユースケース**: キャンペーン用QRコード

### 優先度: 低

#### 8. QRコードデザインカスタマイズ
- ロゴ埋め込み
- カラー変更
- 角丸設定

#### 9. 動的リダイレクト
時間帯や曜日によってリダイレクト先を変更。

```
平日9-18時: 予約ページ
それ以外: LINE友達追加ページ
```

#### 10. オフライン対応
スキャン時にネットワーク接続がない場合のフォールバック表示。

---

## 実装優先順位

### Phase 1（MVP）
1. データモデル変更（Channel, ScanLog）
2. `/c/{code}` ルートのリダイレクト対応
3. チャネル作成・編集UIの拡張
4. スキャン数の表示

### Phase 2
5. UTMパラメータ自動付与
6. リダイレクトURL検証
7. スキャン重複除去

### Phase 3
8. スキャン統計ダッシュボード
9. 有効期限設定
10. A/Bテスト機能

---

## 技術的考慮事項

### パフォーマンス
- ScanLogは高頻度で挿入されるため、インデックス設計が重要
- 統計クエリはキャッシュ検討（Redis等）

### セキュリティ
- オープンリダイレクト脆弱性対策
  - 許可ドメインリスト or 歯科医院ごとの登録URLのみ許可
- レートリミット（DDoS対策）

### 既存機能との整合性
- AccessLogとScanLogの役割分離
  - AccessLog: ページビュー（診断ページ等）
  - ScanLog: QRスキャン（リダイレクト用）
- CTAClickはdiagnosisタイプ専用として維持

---

## UI/UXモックアップ

### チャネル作成画面

```
┌─────────────────────────────────────────┐
│ 新規チャネル作成                          │
├─────────────────────────────────────────┤
│                                         │
│ チャネル名 *                              │
│ ┌─────────────────────────────────────┐ │
│ │ ポスティング用                        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ タイプ *                                 │
│ ┌─────────────┐ ┌─────────────┐        │
│ │ ○ 診断付き   │ │ ● リンクのみ │        │
│ └─────────────┘ └─────────────┘        │
│                                         │
│ ┌─ リンクのみ選択時 ─────────────────┐   │
│ │                                    │   │
│ │ リダイレクト先URL *                  │   │
│ │ ┌──────────────────────────────┐   │   │
│ │ │ https://line.me/R/ti/p/@xxx  │   │   │
│ │ └──────────────────────────────┘   │   │
│ │                                    │   │
│ │ □ UTMパラメータを自動付与           │   │
│ │                                    │   │
│ └────────────────────────────────────┘   │
│                                         │
│           ［キャンセル］ ［作成］          │
└─────────────────────────────────────────┘
```

### チャネル詳細画面（リンクタイプ）

```
┌─────────────────────────────────────────┐
│ ポスティング用                    [編集]  │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────┐   スキャン数               │
│  │ QRコード │   ┌─────────────────────┐  │
│  │  [画像]  │   │      1,234 回       │  │
│  │         │   └─────────────────────┘  │
│  └─────────┘                            │
│                                         │
│  リダイレクト先                          │
│  https://line.me/R/ti/p/@xxx            │
│                                         │
├─────────────────────────────────────────┤
│ スキャン推移（過去30日）                  │
│ ┌─────────────────────────────────────┐ │
│ │  ▂▃▅▇█▆▄▂▃▅▇█▆▄▂▃▅▇█▆▄▂▃▅▇█▆▄▂▃  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 地域別分布                               │
│ ┌─────────────────────────────────────┐ │
│ │ 東京都    ████████████  45%         │ │
│ │ 神奈川県  ██████        25%         │ │
│ │ 埼玉県    ████          15%         │ │
│ │ その他    ███           15%         │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 見積もり工数

| フェーズ | 項目 | 工数目安 |
|---------|------|---------|
| Phase 1 | MVP実装 | 2-3日 |
| Phase 2 | セキュリティ・重複除去 | 1-2日 |
| Phase 3 | 統計・A/Bテスト | 2-3日 |

---

## 質問事項

1. リダイレクト先URLの制限は必要か？（外部ドメイン許可範囲）
2. スキャン統計の保持期間は？（無制限 or 1年等）
3. A/Bテスト機能の優先度は？
4. 有料プラン限定機能にするか？
