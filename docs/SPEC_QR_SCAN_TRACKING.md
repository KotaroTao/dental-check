# QR読み込みトラッキング機能拡張 仕様書

## 1. 概要

### 1.1 目的
診断なしQRコード（リンクタイプ）のスキャンデータを、診断タイプQRと同様に詳細なトラッキング可能にする。これにより、ダッシュボードの「エリア」「履歴」セクションで統一されたデータを表示できるようにする。

### 1.2 用語変更

| 変更前 | 変更後 | 対象 |
|--------|--------|------|
| スキャン回数 | QR読み込み | リンクタイプQRコード詳細ページ |
| 診断実施エリア | QR読み込みエリア | ダッシュボード |
| 診断完了履歴 | QR読み込み履歴 | ダッシュボード |

### 1.3 現状の課題

**診断タイプQR（現状）:**
- `DiagnosisSession`テーブルに詳細データ保存
- 日時、位置情報（都道府県/市区町村/町丁目/緯度経度）、年齢、性別など記録
- エリアマップ表示、履歴一覧表示が可能

**リンクタイプQR（現状）:**
- `Channel.scanCount`で回数のみカウント
- 個別のスキャンログがない
- いつ、どこでスキャンされたか不明
- エリア・履歴に含まれない

---

## 2. 提案する変更

### 2.1 データモデル変更

#### 新規テーブル: `QRScan`

```prisma
// QRスキャンログ（リンクタイプQR用）
model QRScan {
  id          String    @id @default(uuid())
  clinicId    String    @map("clinic_id")
  channelId   String    @map("channel_id")
  scannedAt   DateTime  @default(now()) @map("scanned_at")

  // 位置情報（GPSベース）
  ipAddress   String?   @map("ip_address")
  country     String?   // 国コード (JP)
  region      String?   // 都道府県 (兵庫県)
  city        String?   // 市区町村 (西宮市)
  town        String?   // 町丁目 (神南一丁目)
  latitude    Float?    // 緯度（小数点2桁、約1km精度）
  longitude   Float?    // 経度（小数点2桁、約1km精度）

  // ユーザー情報（任意、将来拡張用）
  userAgent   String?   @map("user_agent")
  referer     String?

  clinic      Clinic    @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  channel     Channel   @relation(fields: [channelId], references: [id], onDelete: Cascade)

  @@index([clinicId, scannedAt])
  @@index([channelId, scannedAt])
  @@index([clinicId, region])
  @@map("qr_scans")
}
```

#### Channelモデル更新

```prisma
model Channel {
  // 既存フィールド...

  // リレーション追加
  qrScans    QRScan[]
}
```

#### Clinicモデル更新

```prisma
model Clinic {
  // 既存フィールド...

  // リレーション追加
  qrScans    QRScan[]
}
```

### 2.2 API変更

#### `/api/c/[code]/route.ts` - リンクタイプリダイレクト処理

**現状:**
```typescript
// スキャン回数をインクリメント
await prisma.channel.update({
  where: { id: channel.id },
  data: { scanCount: { increment: 1 } },
});
```

**変更後:**
```typescript
// 位置情報を取得
const geo = await getGeolocation(request);

// QRスキャンログを記録
await prisma.qRScan.create({
  data: {
    clinicId: channel.clinicId,
    channelId: channel.id,
    ipAddress: geo.ip,
    country: geo.country,
    region: geo.region,
    city: geo.city,
    town: geo.town,
    latitude: geo.latitude ? Math.round(geo.latitude * 100) / 100 : null,
    longitude: geo.longitude ? Math.round(geo.longitude * 100) / 100 : null,
    userAgent: request.headers.get("user-agent") || null,
    referer: request.headers.get("referer") || null,
  },
});

// スキャン回数をインクリメント（既存ロジック維持、冗長だが後方互換性のため）
await prisma.channel.update({
  where: { id: channel.id },
  data: { scanCount: { increment: 1 } },
});
```

#### `/api/dashboard/locations/route.ts` - エリアデータ取得

**変更概要:**
1. `DiagnosisSession`（診断タイプ）と`QRScan`（リンクタイプ）の両方からデータ取得
2. 結果を統合してレスポンス

**実装方針:**
```typescript
// 診断セッションからのエリアデータ
const diagnosisLocations = await prisma.diagnosisSession.groupBy({...});

// QRスキャンからのエリアデータ
const qrScanLocations = await prisma.qRScan.groupBy({...});

// 両方を統合
const allLocations = [...diagnosisLocations, ...qrScanLocations];
```

#### `/api/dashboard/history/route.ts` - 履歴データ取得

**変更概要:**
1. `DiagnosisSession`と`QRScan`の両方から履歴取得
2. 統一フォーマットで返却
3. 「種類」フィールドで診断/QR読み込みを区別

**履歴レスポンス形式:**
```typescript
interface HistoryItem {
  id: string;
  type: "diagnosis" | "qr_scan";  // 新規追加
  createdAt: Date;

  // 診断の場合
  userAge?: number;
  userGender?: string;
  diagnosisType?: string;
  diagnosisTypeSlug?: string;

  // 共通
  channelName: string;
  channelId: string;
  area: string;

  // 診断の場合のみ
  ctaType?: string;
  ctaClickCount?: number;
}
```

### 2.3 UI変更

#### ダッシュボードページ (`/dashboard/page.tsx`)

1. **セクションタイトル変更**
   - 「診断実施エリア」→「QR読み込みエリア」
   - 「診断完了履歴」→「QR読み込み履歴」

2. **履歴テーブル列追加**
   - 「種類」列を追加（「診断」or「QR読み込み」）

#### LocationSection (`location-section.tsx`)

1. **タイトル変更**
   - 「診断実施エリア」→「QR読み込みエリア」

2. **凡例・ヘルプ更新**
   - 「診断が実施されると...」→「QRコードが読み込まれると...」

#### チャンネル詳細ページ (`/dashboard/channels/[id]/page.tsx`)

1. **ラベル変更**
   - 「スキャン回数」→「QR読み込み回数」

---

## 3. 検討事項

### 3.1 データ整合性

| 項目 | 対応方針 |
|------|----------|
| 既存の`scanCount`との整合性 | 後方互換性のため両方更新。`scanCount`は非推奨とし、将来的には`QRScan`のCOUNTに移行 |
| 移行済みデータの扱い | 既存の`scanCount`は維持。詳細ログは今後のスキャンからのみ |

### 3.2 パフォーマンス考慮

| 項目 | 対応方針 |
|------|----------|
| QRスキャンログの増加 | 適切なインデックス設定。定期的な古いログのアーカイブ検討 |
| 複数テーブル結合のコスト | ダッシュボード用に集計テーブル導入を将来検討 |
| リダイレクト処理の遅延 | ログ記録を非同期化（リダイレクトを先に返す） |

### 3.3 プライバシー考慮

| 項目 | 対応方針 |
|------|----------|
| 位置情報の精度 | 小数点2桁（約1km精度）に丸めて保存 |
| IPアドレス保存 | ハッシュ化を検討。または一定期間後に削除 |
| 個人特定の防止 | 年齢・性別などの個人情報は収集しない（診断と異なる） |

### 3.4 将来拡張

| 項目 | 検討内容 |
|------|----------|
| ユニーク訪問者数 | Cookie/フィンガープリントでユニーク計測 |
| コンバージョン追跡 | リダイレクト先でのアクション追跡（別途実装） |
| リファラー分析 | どこからQRを読み込んだか（Web経由の場合） |
| 時間帯分析 | 時間帯別のスキャン傾向分析 |

---

## 4. 実装計画

### Phase 1: データモデル・API（優先度: 高）

1. Prismaスキーマに`QRScan`テーブル追加
2. マイグレーション実行
3. `/api/c/[code]/route.ts`でQRスキャンログ記録
4. 位置情報取得処理の実装（既存の`getGeolocation`活用）

### Phase 2: エリアセクション統合（優先度: 高）

1. `/api/dashboard/locations/route.ts`で両データソース統合
2. `LocationSection`のタイトル変更
3. ヘルプテキスト更新

### Phase 3: 履歴セクション統合（優先度: 中）

1. `/api/dashboard/history/route.ts`で両データソース統合
2. 履歴テーブルに「種類」列追加
3. タイトル変更「診断完了履歴」→「QR読み込み履歴」

### Phase 4: その他UI更新（優先度: 低）

1. チャンネル詳細の「スキャン回数」→「QR読み込み回数」
2. 仕様書・ヘルプテキストの用語統一

---

## 5. 追加が必要と思われる事項

### 5.1 必須追加事項

| 項目 | 理由 |
|------|------|
| 非同期ログ記録 | リダイレクト処理の高速化。ユーザー体験への影響を最小化 |
| エラーハンドリング | ログ記録失敗時もリダイレクトは正常に動作させる |
| テストケース | 両タイプのQRでのエリア・履歴表示テスト |

### 5.2 推奨追加事項

| 項目 | 理由 |
|------|------|
| 管理画面での分析 | 診断vsリンクタイプの比較分析機能 |
| CSV/Excelエクスポート | QRスキャンログのエクスポート機能 |
| リアルタイム更新 | ダッシュボードのリアルタイム更新（WebSocket/SSE） |

### 5.3 将来検討事項

| 項目 | 理由 |
|------|------|
| データ保持期間ポリシー | ログデータの肥大化防止、GDPR対応 |
| 匿名化オプション | IPアドレスの定期削除、位置情報の粗粒度化オプション |
| レポート機能 | 月次レポート自動生成 |

---

## 6. 既存機能への影響

### 6.1 影響なし

- 診断タイプQRの動作
- 診断フロー
- CTAクリック追跡
- 課金・サブスクリプション

### 6.2 変更あり（後方互換）

| 機能 | 影響 |
|------|------|
| ダッシュボード統計 | 表示ラベル変更のみ。データ構造は互換 |
| チャンネル詳細 | ラベル変更のみ |
| locations API | レスポンスにQRスキャンデータ追加 |
| history API | レスポンスに`type`フィールド追加 |

---

## 7. 承認事項

- [ ] データモデル設計の承認
- [ ] 用語変更の承認
- [ ] プライバシーポリシーへの影響確認
- [ ] 実装スケジュールの確認

---

## 8. 参考資料

- `docs/SPEC_LOCATION_TRACKING.md` - 既存のエリア表示機能仕様
- `docs/SPEC_QR_LINK.md` - QRコードリンク機能仕様
- `prisma/schema.prisma` - 現行データモデル
