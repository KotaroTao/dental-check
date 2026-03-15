# CLAUDE.md - プロジェクト設定

## ユーザーについて

- プログラミング超初心者。Claude Codeで開発を進めながら学んでいる
- 日本語で対応すること

## コミュニケーションスタイル

- コードを変更・追加するときは、**何をしているのか・なぜそうするのか**を初心者にもわかる言葉で説明する
- 専門用語を使うときは、必ずカッコ書きやたとえ話で補足する
  - 例: 「ミドルウェア（リクエストが届く前にチェックする門番のようなもの）」
- 大きな変更は、ステップごとに区切って説明する
- 「何が変わったか」「なぜ安全/良くなったか」をビフォー・アフターで示す

## プロジェクト概要

- **アプリ名**: QRくるくる診断DX
- **用途**: 歯科医院向けのQRコードマーケティング＆分析プラットフォーム（B2B SaaS）
- **本番環境**: Xserver VPS (Ubuntu), Nginx + PM2, ドメイン qrqr-dental.com

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router, standalone出力)
- **言語**: TypeScript (strict mode)
- **DB**: PostgreSQL + Prisma ORM
- **UI**: Tailwind CSS + Shadcn/ui (Radix UI)
- **状態管理**: Zustand
- **フォーム**: React Hook Form + Zod バリデーション
- **認証**: JWT (jose) + Cookie、ミドルウェアで保護
- **決済**: Pay.jp
- **グラフ**: Recharts
- **地図**: Leaflet / React-Leaflet
- **テスト**: Vitest
- **パスエイリアス**: `@/*` → `./src/*`

## コマンド

- `npm run build` — ビルド（= `prisma generate && next build`）
- `npm run dev` — 開発サーバー起動
- `npm run lint` — ESLint実行
- `npm run test` — テスト実行（Vitest）
- `npm run test:watch` — テスト監視モード
- `npm run db:seed` — シードデータ投入

## プロジェクト構造

```
src/
├── app/                  # Next.js App Routerのページ群
│   ├── admin/            # 管理者パネル（別認証）
│   ├── api/              # APIルート
│   ├── c/                # QRコード経由の公開ページ
│   ├── dashboard/        # 医院向けダッシュボード（要認証）
│   ├── demo/             # デモページ
│   ├── embed/            # 埋め込み用ページ
│   ├── login/signup/     # 認証ページ
│   ├── pricing/          # 料金ページ
│   └── legal/terms/privacy/ # 法的ページ
├── components/           # UIコンポーネント
│   ├── ui/               # Shadcn/uiベースの汎用コンポーネント
│   ├── admin/            # 管理者用コンポーネント
│   ├── dashboard/        # ダッシュボード用コンポーネント
│   ├── diagnosis/        # 診断用コンポーネント
│   ├── channel/          # QRチャネル用コンポーネント
│   └── link/             # リンク用コンポーネント
├── lib/                  # ユーティリティ・ビジネスロジック
│   ├── auth.ts           # 医院認証（JWT発行・検証）
│   ├── admin-auth.ts     # 管理者認証
│   ├── prisma.ts         # Prismaクライアント
│   ├── rate-limit.ts     # レート制限
│   └── ...               # 決済・メール・位置情報など
├── middleware.ts          # 認証ミドルウェア（/dashboard保護, /login リダイレクト）
├── __tests__/            # テストファイル
└── types/                # 型定義
prisma/
├── schema.prisma         # DBスキーマ
├── migrations/           # マイグレーション
└── seed.ts               # シードデータ
```

## 主要なDBモデル

- **Clinic** — 医院（認証・設定・ブランディング・ロック機能）
- **Channel** — QRコード経路（diagnosis型 / link型、予算・配布方法・有効期限管理）
- **DiagnosisType** — 診断タイプ（全医院共通 or 医院固有、質問・結果パターンをJSON保持）
- **DiagnosisSession** — 診断セッション（回答・スコア・位置情報・論理削除対応）
- **AccessLog / CTAClick** — アクセス解析・CTA計測
- **Subscription** — Pay.jp連携のサブスク管理（trial/active/canceled/past_due/expired）
- **Admin / AuditLog** — 管理者・監査ログ
- **InvitationToken** — 招待・パスワードリセット用トークン

## 認証の仕組み

- 医院ユーザー: JWT (HS256, 7日有効) + Cookie (`auth_token`)。`src/middleware.ts`で`/dashboard`を保護
- 管理者: Cookie (`admin_auth_token`, 24時間有効)。`src/lib/admin-auth.ts`で管理
- パスワード: bcryptjsでハッシュ化
- ログイン済みユーザーが`/login`にアクセスすると`/dashboard`へリダイレクト

## APIルート構成

- `/api/auth/` — ログイン・サインアップ・ログアウト
- `/api/admin/` — 管理者認証・医院CRUD・診断タイプCRUD
- `/api/channels/` — QRコード管理
- `/api/dashboard/` — ダッシュボードデータ取得
- `/api/track/` — アクセスログ・診断完了・CTAクリック・位置情報更新
- `/api/billing/` — Pay.jp決済
- `/api/upload/` — ファイルアップロード
- `/api/webhook/payjp/` — Pay.jpウェブフック

## デプロイ

- GitHub Actions（mainブランチにpushで自動デプロイ: `.github/workflows/deploy.yml`）
- VPSにSSHでgit pull → npm install → prisma db push → build → pm2 restart
- Docker対応あり（Dockerfile / docker-compose.yml）
