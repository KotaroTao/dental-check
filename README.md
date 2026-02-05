# Dental Check - 歯科医院向けQR診断システム

歯科医院向けのQRコードベース診断システム。患者がQRコードをスキャンすると診断を受けられ、医院はダッシュボードで効果測定ができる。

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **DB**: PostgreSQL + Prisma ORM
- **認証**: JWT (jose)
- **決済**: PAY.JP
- **スタイリング**: Tailwind CSS
- **デプロイ**: GitHub Actions + SSH

## セットアップ

```bash
# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env
# DATABASE_URL, JWT_SECRET 等を設定

# DBマイグレーション
npx prisma migrate dev

# 診断タイプのシード（重要！）
npx tsx scripts/seed-diagnoses.ts

# 開発サーバー起動
npm run dev
```

## プロジェクト構成

```
src/
├── app/
│   ├── api/                    # APIルート
│   │   ├── admin/              # 管理者用API
│   │   ├── auth/               # 医院認証
│   │   ├── dashboard/          # ダッシュボード用API
│   │   │   ├── stats/          # 効果測定サマリー
│   │   │   ├── channel-stats/  # チャンネル別統計
│   │   │   └── history/        # 読み込み履歴
│   │   └── track/              # トラッキングAPI
│   │       ├── access/         # QRアクセス記録
│   │       ├── complete/       # 診断完了記録
│   │       ├── link-complete/  # リンク型QR完了記録
│   │       └── cta/            # CTAクリック記録
│   ├── admin/                  # 管理者ダッシュボード
│   ├── dashboard/              # 医院ダッシュボード
│   │   └── channels/           # QRコード管理
│   ├── [clinicSlug]/           # 患者向け診断ページ
│   └── q/[code]/               # QRコードリダイレクト
├── components/                 # 共通コンポーネント
└── lib/                        # ユーティリティ
    └── prisma.ts               # Prismaクライアント
```

## データベース設計

### 主要テーブル

| テーブル | 説明 |
|---------|------|
| `Clinic` | 医院情報 |
| `Channel` | QRコード（経路別計測用） |
| `DiagnosisType` | 診断タイプ定義（質問・結果パターン） |
| `DiagnosisSession` | 診断セッション（回答・結果） |
| `AccessLog` | QRアクセスログ |
| `CTAClick` | CTAクリックログ |

### チャンネルタイプ

- **`diagnosis`**: 診断型 - QRスキャン → 診断 → 結果 → CTA
- **`link`**: リンク型 - QRスキャン → 直接リダイレクト（CTAは`direct_link`として記録）

## 重要な実装詳細

### 1. 診断タイプのシード（超重要）

**新しい診断タイプを追加する場合、必ずDBにレコードが必要。**

`track/complete` APIは `DiagnosisType` テーブルを参照し、存在しない場合はセッション作成に失敗する。

```typescript
// /src/app/api/track/complete/route.ts
const diagnosisTypeRecord = await prisma.diagnosisType.findUnique({
  where: { slug: diagnosisType },
});
if (!diagnosisTypeRecord) {
  return NextResponse.json({ error: "DiagnosisType not found" }, { status: 404 });
}
```

**現在登録済みの診断タイプ:**
- `oral-age` - お口年齢診断
- `child-orthodontics` - 子供の矯正タイミングチェック
- `periodontal-risk` - 歯周病リスク診断
- `cavity-risk` - 虫歯リスク診断
- `whitening-check` - ホワイトニング適正診断

新規追加時は `/scripts/seed-diagnoses.ts` を更新して実行:
```bash
npx tsx scripts/seed-diagnoses.ts
```

### 2. 論理削除と統計フィルタリング

**AccessLog**: `isDeleted` カラムあり
**CTAClick**: `isDeleted` カラムなし（session経由でフィルタ）

```typescript
// AccessLogのフィルタリング
where: { isDeleted: false }

// CTAClickのフィルタリング（sessionを経由）
where: {
  OR: [
    { sessionId: null },
    { session: { isDeleted: false } },
  ],
}
```

### 3. CTA タイプ一覧

| ctaType | 表示名 |
|---------|--------|
| `line` | LINE |
| `phone` | 電話 |
| `reservation` | 予約 |
| `clinic_homepage` | ホームページ |
| `direct_link` | 直リンク |

### 4. 診断タイプ名のマッピング

複数ファイルで定義されているため、変更時は全て更新が必要:

- `/src/app/dashboard/page.tsx`
- `/src/app/dashboard/channels/[id]/page.tsx`
- `/src/app/dashboard/channels/[id]/edit/page.tsx`
- `/src/app/api/dashboard/history/route.ts`

```typescript
const DIAGNOSIS_TYPE_NAMES: Record<string, string> = {
  "oral-age": "お口年齢診断",
  "child-orthodontics": "子供の矯正タイミングチェック",
  "periodontal-risk": "歯周病リスク診断",
  "cavity-risk": "虫歯リスク診断",
  "whitening-check": "ホワイトニング適正診断",
};
```

## デプロイ

### GitHub Actions（自動）

`main` ブランチへのpushで自動デプロイ。

必要なSecrets:
- `DEPLOY_HOST`: サーバーIP
- `DEPLOY_USER`: SSHユーザー名
- `DEPLOY_SSH_KEY`: SSH秘密鍵

### 手動デプロイ

```bash
ssh user@server
cd /var/www/dental-check
git pull origin main
npm install
npx prisma migrate deploy
npm run build
pm2 restart dental-check
```

### シード実行（本番）

```bash
cd /var/www/dental-check
npx tsx scripts/seed-diagnoses.ts
```

## トラブルシューティング

### 症状: 新しい診断タイプの履歴・統計が表示されない

**原因**: `DiagnosisType` テーブルにレコードがない

**解決策**:
1. シードスクリプトに診断タイプを追加
2. 本番でシード実行: `npx tsx scripts/seed-diagnoses.ts`

### 症状: ts-node でエラー "Unknown file extension .ts"

**解決策**: `tsx` を使用
```bash
# NG
npx ts-node scripts/seed-diagnoses.ts

# OK
npx tsx scripts/seed-diagnoses.ts
```

### 症状: 効果測定サマリーが一部表示されない

**確認ポイント**:
1. 該当チャンネルに紐づくセッションが存在するか
2. セッションが `isDeleted: false` か
3. 診断タイプがDBに登録されているか

## 開発時の注意点

1. **診断タイプ追加時**: 必ずシードスクリプトを更新してDBに登録
2. **CTAClick統計**: `isDeleted`カラムがないため、session経由でフィルタ
3. **複数ファイルの同期**: `DIAGNOSIS_TYPE_NAMES`, `CTA_TYPE_NAMES` は複数箇所で定義
4. **linkタイプのCTA**: `direct_link` として `CTAClick` に記録される
