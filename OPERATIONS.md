# くるくる診断DX for Dental - 運用手順書

## Windows PC 開発環境

### プロジェクトパス
```
C:\Users\hacha\Documents\dental-check
```

### 開発を始める前のチェックリスト

1. **Docker Desktopが起動しているか確認**
2. **ローカルDBコンテナが起動しているか確認**
```cmd
docker ps
```
3. **コンテナが停止している場合は起動**
```cmd
docker start dental-local-db
```

### 起動方法（コマンドプロンプト）
```cmd
cd C:\Users\hacha\Documents\dental-check
npm run dev -- -p 3002
```
※ PowerShellでは実行ポリシーエラーが出るため、コマンドプロンプト(cmd)を使用

### アクセスURL

| 画面 | URL |
|------|-----|
| トップページ | http://localhost:3002 |
| 医院ログイン | http://localhost:3002/login |
| 医院新規登録 | http://localhost:3002/signup |
| 医院ダッシュボード | http://localhost:3002/dashboard |
| 管理者ログイン | http://localhost:3002/admin/login |
| 管理者ダッシュボード | http://localhost:3002/admin/diagnoses |

### テスト用アカウント

| 種別 | メールアドレス | パスワード |
|------|--------------|-----------|
| 管理者 | mail@function-t.com | MUNP1687 |

### ローカルDB（Docker）

**初回起動（既に実行済み）:**
```cmd
docker run -d --name dental-local-db -e POSTGRES_USER=dental_user -e POSTGRES_PASSWORD=localpass -e POSTGRES_DB=dental_check -p 5433:5432 postgres:15
```

**2回目以降の起動:**
```cmd
docker start dental-local-db
```

**停止:**
```cmd
docker stop dental-local-db
```

| 項目 | 値 |
|------|-----|
| ホスト | localhost |
| ポート | 5433 |
| ユーザー | dental_user |
| パスワード | localpass |
| データベース | dental_check |

### .env ファイル（Windows）
`C:\Users\hacha\Documents\dental-check\.env`
```
DATABASE_URL="postgresql://dental_user:localpass@localhost:5433/dental_check"
JWT_SECRET="qrqr-dental-jwt-secret-key-2025-very-long-random-string-here"
NEXT_PUBLIC_APP_URL="http://localhost:3002"
```

### 管理者アカウント作成（Windows）
```cmd
cd C:\Users\hacha\Documents\dental-check
set ADMIN_EMAIL=mail@function-t.com
set ADMIN_PASSWORD=MUNP1687
node scripts/create-admin.js
```

### 本番DBからデータを同期

**1. 本番サーバーでバックアップ作成（SSH接続後）:**
```bash
cd /var/www/dental-check
docker exec dental-check-db pg_dump -U dental_user -d dental_check > backup.sql
```

**2. Windows PCでダウンロード（コマンドプロンプト）:**
```cmd
cd C:\Users\hacha\Downloads
scp -i dental-check-key.pem root@210.131.223.161:/var/www/dental-check/backup.sql ./backup.sql
```

**3. ローカルDBにインポート（PowerShell）:**
```powershell
cd C:\Users\hacha\Downloads
Get-Content backup.sql | docker exec -i dental-local-db psql -U dental_user -d dental_check
```

### Windows PC 開発フロー

```
① コード修正 → ② ブラウザで確認 → ③ コミット＆プッシュ → ④ 本番デプロイ
```

**コミット＆プッシュ（コマンドプロンプト）:**
```cmd
cd C:\Users\hacha\Documents\dental-check
git add .
git commit -m "修正内容"
git push origin claude/plan-qr-measurements-wb4qE
```

**最新コードを取得:**
```cmd
cd C:\Users\hacha\Documents\dental-check
git pull origin claude/plan-qr-measurements-wb4qE
```

---

## クラウド開発環境（Claude Code）

### プロジェクトパス
```
/home/user/dental-check
```

### 起動方法
```bash
cd /home/user/dental-check
npm install
npm run dev -- -p 3001
```

### アクセスURL

| 画面 | URL |
|------|-----|
| トップページ | http://localhost:3001 |
| 医院ログイン | http://localhost:3001/login |
| 医院ダッシュボード | http://localhost:3001/dashboard |
| 管理者ログイン | http://localhost:3001/admin/login |
| 管理者ダッシュボード | http://localhost:3001/admin/diagnoses |

---

## 本番環境（Xserver VPS）

### サーバー情報

| 項目 | 値 |
|------|-----|
| ドメイン | qrqr-dental.com |
| サーバーIP | 210.131.223.161 |
| サーバー種別 | Xserver VPS |
| OS | Ubuntu |

## SSH接続

### Windows PowerShell
```powershell
ssh -i $env:USERPROFILE\Downloads\dental-check-key.pem root@210.131.223.161
```

### Mac/Linux
```bash
ssh -i ~/Downloads/dental-check-key.pem root@210.131.223.161
```

## プロジェクトパス

```bash
cd /var/www/dental-check
```

## Docker関連コマンド

### コンテナ状態確認
```bash
docker compose -f docker-compose.production.yml --env-file .env.production ps
```

### ログ確認
```bash
# 全コンテナ
docker compose -f docker-compose.production.yml --env-file .env.production logs -f

# アプリのみ
docker compose -f docker-compose.production.yml --env-file .env.production logs -f app
```

### コンテナ再起動
```bash
docker compose -f docker-compose.production.yml --env-file .env.production restart
```

### コンテナ停止・起動
```bash
# 停止
docker compose -f docker-compose.production.yml --env-file .env.production down

# 起動
docker compose -f docker-compose.production.yml --env-file .env.production up -d
```

### ビルド＆デプロイ（自動スクリプト推奨）

**推奨: 自動デプロイスクリプトを使用**
```bash
cd /var/www/dental-check
./scripts/deploy.sh
```

デプロイスクリプトは以下を自動実行：
1. 最新コードの取得（git pull）
2. 環境変数チェック
3. SSL証明書チェック
4. Dockerイメージビルド（コミットハッシュでタグ付け）
5. 既存コンテナ停止
6. データベースマイグレーション
7. コンテナ起動
8. ヘルスチェック
9. デプロイ検証

**手動デプロイ（非推奨）**
```bash
cd /var/www/dental-check
git pull origin claude/plan-qr-measurements-wb4qE
docker compose -f docker-compose.production.yml --env-file .env.production build --no-cache
docker compose -f docker-compose.production.yml --env-file .env.production up -d
```
※手動デプロイ時は必ず`git pull`を先に実行すること。忘れると古いコードがデプロイされる。

## データベース操作

### ネットワーク名
```
dental-check_dental-network
```

### 接続情報
- ユーザー: `dental_user`
- パスワード: `.env.production` の `POSTGRES_PASSWORD` を参照
- データベース名: `dental_check`
- ホスト: `db`
- ポート: `5432`

### マイグレーション実行
```bash
docker run --rm --network dental-check_dental-network \
  -e DATABASE_URL='postgresql://dental_user:PASSWORD@db:5432/dental_check' \
  -v $(pwd)/prisma:/app/prisma -w /app node:20 \
  sh -c "npm install prisma@5.22.0 && npx prisma db push"
```
※ `PASSWORD` は実際のパスワードに置き換え

### データベースに直接接続
```bash
docker exec -it dental-check-db psql -U dental_user -d dental_check
```

## 管理者操作

### 管理画面

| 項目 | 値 |
|------|-----|
| URL | https://qrqr-dental.com/admin/login |
| メールアドレス | mail@function-t.com |
| パスワード | MUNP1687 |

### 管理者アカウント作成
```bash
docker run --rm --network dental-check_dental-network \
  -e DATABASE_URL='postgresql://dental_user:PASSWORD@db:5432/dental_check' \
  -e ADMIN_EMAIL=your@email.com \
  -e ADMIN_PASSWORD=your-password \
  -v $(pwd):/app -w /app node:20 \
  sh -c "npm install prisma@5.22.0 @prisma/client@5.22.0 bcryptjs && node scripts/create-admin.js"
```

### 診断データシード
```bash
docker run --rm --network dental-check_dental-network \
  -e DATABASE_URL='postgresql://dental_user:PASSWORD@db:5432/dental_check' \
  -v $(pwd):/app -w /app node:20 \
  sh -c "npm install prisma@5.22.0 @prisma/client@5.22.0 && node scripts/seed-diagnoses.js"
```

## SSL証明書

### 証明書更新（自動更新設定済み）
```bash
docker exec dental-check-nginx certbot renew
```

### 証明書状態確認
```bash
docker exec dental-check-nginx certbot certificates
```

## トラブルシューティング

### デプロイしても新しいコードが反映されない

**症状**: デプロイ後もアプリが古いまま、UIの変更が反映されない

**原因**: `git pull`を実行せずに`docker build`を実行した場合、Dockerのビルドキャッシュにより古いコードがイメージに入る

**確認方法**:
```bash
# コンテナ内のコードを確認（例: mobileMenuOpenが含まれているか）
docker exec dental-check-app grep -l "mobileMenuOpen" /app/.next/server/app/dashboard/layout.js
# → ファイルが見つからない場合は古いコード
```

**解決策**:
```bash
cd /var/www/dental-check
git pull origin claude/plan-qr-measurements-wb4qE   # ← 必ず先にpull
docker compose -f docker-compose.production.yml --env-file .env.production build --no-cache
docker compose -f docker-compose.production.yml --env-file .env.production up -d
```

**予防策**: 自動デプロイスクリプト `./scripts/deploy.sh` を使用する（git pullが自動実行される）

### コンテナが起動しない
```bash
# ログを確認
docker compose -f docker-compose.production.yml --env-file .env.production logs app

# コンテナを強制削除して再作成
docker compose -f docker-compose.production.yml --env-file .env.production down -v
docker compose -f docker-compose.production.yml --env-file .env.production up -d
```

### ディスク容量確認
```bash
df -h
docker system df
```

### 不要なDockerリソース削除
```bash
docker system prune -a
```

### Nginxの設定テスト
```bash
docker exec dental-check-nginx nginx -t
```

## 環境変数

`.env.production` に以下が設定されています：

| 変数名 | 説明 |
|--------|------|
| POSTGRES_PASSWORD | データベースパスワード |
| JWT_SECRET | JWT署名用シークレット |
| NEXT_PUBLIC_APP_URL | アプリのURL |
| PAYJP_SECRET_KEY | Pay.jp シークレットキー |
| PAYJP_WEBHOOK_SECRET | Pay.jp Webhookシークレット |
| NEXT_PUBLIC_PAYJP_PUBLIC_KEY | Pay.jp 公開キー |

## Git ブランチ

- 開発ブランチ: `claude/plan-qr-measurements-wb4qE`
- リポジトリ: `https://github.com/KotaroTao/dental-check`

### ローカル→本番 反映手順（クイックリファレンス）

1. **ローカルで修正をコミット＆プッシュ**
```bash
git add .
git commit -m "修正内容"
git push origin claude/plan-qr-measurements-wb4qE
```

2. **本番サーバーにSSH接続**
```bash
ssh -i ~/Downloads/dental-check-key.pem root@210.131.223.161
```

3. **本番サーバーでデプロイ**
```bash
cd /var/www/dental-check
./scripts/deploy.sh
```
※自動でgit pull、ビルド、マイグレーション、起動、検証まで実行される

### セッション間で引き継ぐ情報

作業を中断・再開する際は、以下を確認：
- 現在のブランチ: `git branch --show-current`
- 未コミットの変更: `git status`
- リモートとの差分: `git fetch origin && git status`

---

## 開発状況（2025年12月28日更新）

### 最新の実装（このセッション）

#### QRコード機能の改善（用語統一・画像アップロード）
- **用語統一**: 「経路」→「QRコード」に全面置き換え
- **ナビゲーション変更**: 「埋め込みコード」→「QRコード作成」
- **画像アップロード**: QRコード作成時に画像（設置場所の写真など）をアップロード可能
  - ドラッグ＆ドロップ対応
  - 最大5MB、JPEG/PNG/WebP対応
  - Base64エンコードで保存
- **サムネイル表示**: ダッシュボードのQRコード一覧にサムネイル画像を表示
- **画像モーダル**: サムネイルクリックでフルサイズ画像を表示
- **QRコード自動生成**: 詳細ページでQRコードを自動生成・表示
- **ダウンロード機能**: PNG/SVG形式でQRコードをダウンロード

#### 電話ボタン・CTAグラフの改善
- **電話ボタン修正**: `<a><Button>` → `<a>` タグに変更（クリック可能に）
- **CTAグラフ改善**:
  - 積み上げ→横並び棒グラフに変更
  - 最小高さ12px保証（少数データでも見える）
  - 色をemerald/indigoに変更
  - Y軸スケール最適化

#### レビュー指摘の改善対応
- **トレンド計算**: isNewフラグ追加（前期0→今期データありの場合「NEW」表示）
- **CSVエクスポート**: ローディング状態・エラーハンドリング追加
- **URL検証**: 相対URLも許可
- **大量データ警告**: 5000件以上のエクスポート時に確認ダイアログ

### 主要ファイル（今回追加・変更）

| ファイル | 説明 |
|---------|------|
| `prisma/schema.prisma` | Channelに`imageUrl`フィールド追加 |
| `src/app/dashboard/page.tsx` | 用語統一・サムネイル・画像モーダル追加 |
| `src/app/dashboard/layout.tsx` | ナビゲーション「QRコード作成」に変更 |
| `src/app/dashboard/channels/new/page.tsx` | 画像アップロード機能追加 |
| `src/app/dashboard/channels/[id]/page.tsx` | QRコード自動生成・SVGダウンロード追加 |
| `src/app/dashboard/channels/[id]/edit/page.tsx` | 用語統一 |
| `src/app/api/channels/route.ts` | imageUrl対応 |
| `src/app/api/channels/[id]/route.ts` | 用語統一 |
| `src/components/diagnosis/result-card.tsx` | 電話ボタン修正 |
| `src/components/dashboard/cta-chart.tsx` | 横並び棒グラフに変更 |
| `src/types/clinic.ts` | Channel型にimageUrl追加 |
| `docs/SPEC_QRCODE_IMPROVEMENTS.md` | QRコード改善の仕様書 |

### DBスキーマ変更

```prisma
model Channel {
  // ... 既存フィールド
  imageUrl  String?  @map("image_url")  // QRコードに紐付く画像（Base64）
}
```

### PR・デプロイ完了

- コミット: `528c137 feat: 経路→QRコードへの用語統一と画像アップロード機能追加`
- ブランチ: `claude/plan-qr-measurements-wb4qE` → `main` にマージ済み
- 本番デプロイ: 完了（2025年12月28日）

---

### 以前のセッション

#### ダッシュボードのレスポンシブデザイン対応
- **ハンバーガーメニュー**: iPad mini・スマートフォンでメニューを折りたたみ表示
- **経路一覧のカード表示**: モバイルでは横スクロールテーブルではなくカード形式で表示
- **診断履歴のカード表示**: モバイルでは履歴を見やすいカード形式で表示
- **統計フィルターの縦並び**: スマートフォンではフィルターを縦に配置

#### デプロイスクリプトの改善（scripts/deploy.sh）
- **自動git pull**: デプロイ時に最新コードを自動取得（古いコードがデプロイされる問題を防止）
- **コミットハッシュタグ**: Dockerイメージにコミットハッシュでタグ付け
- **デプロイ検証**: デプロイ後に新しいコードが反映されたか自動確認
- **docker compose対応**: 新しいDocker CLIの`docker compose`コマンドを使用

#### 医院紹介ページの大幅強化
- **写真カルーセル**: 複数写真のスライダー表示
- **フローティングCTA**: スクロール300px以降で表示される電話・予約ボタン
- **曜日別診療時間表**: 午前/午後/休診を曜日ごとに設定
- **診療内容セクション**: プリセットから選択式（一般歯科、矯正歯科など）
- **設備・特徴セクション**: プリセットから選択式（駐車場、バリアフリーなど）
- **お知らせ機能**: 日付・重要フラグ付きのお知らせ
- **リアルタイムプレビュー**: 編集画面で公開イメージを確認
- **固定保存ボタン**: 画面右下に常時表示

#### 写真アップロード機能
- **ファイルアップロードAPI**: `/api/upload`
- **ドラッグ＆ドロップ**: ファイルを直接ドロップでアップロード
- **クライアント側自動圧縮**: 1200px、JPEG 80%品質
- **並び替え機能**: ドラッグで写真の順序変更
- **複数ファイル同時アップロード**: 複数選択・一括ドロップ対応
- **削除確認**: 削除時にconfirmダイアログ表示

#### Docker本番環境対応
- **uploads_dataボリューム**: アップロードファイルの永続化
- **Nginxで直接配信**: `/uploads/`パスをNginxが直接配信（Next.js standalone対応）

### 主要ファイル（今回追加・変更）

| ファイル | 説明 |
|---------|------|
| `src/app/dashboard/layout.tsx` | ダッシュボードヘッダー（ハンバーガーメニュー追加） |
| `src/app/dashboard/page.tsx` | ダッシュボード（モバイルカード表示追加） |
| `scripts/deploy.sh` | 本番デプロイスクリプト（自動git pull・検証機能追加） |
| `src/app/api/upload/route.ts` | 画像アップロードAPI |
| `src/app/dashboard/clinic/page.tsx` | 医院紹介ページ編集（大幅改修） |
| `src/app/clinic/[slug]/page.tsx` | 公開医院ページ |
| `src/app/clinic/[slug]/photo-carousel.tsx` | 写真カルーセルコンポーネント |
| `src/app/clinic/[slug]/floating-cta.tsx` | フローティングCTAコンポーネント |
| `src/types/clinic.ts` | ClinicPage型定義（拡張） |
| `docker-compose.production.yml` | uploadsボリューム追加 |
| `Dockerfile.production` | uploadsディレクトリ作成 |
| `nginx/nginx.conf` | /uploads/のlocationブロック追加 |

### 型定義（ClinicPage）

```typescript
interface ClinicPage {
  photos?: ClinicPhoto[];        // 医院写真
  director?: DirectorInfo;       // 院長情報
  hours?: ClinicHours;           // 診療時間（簡易版）
  weeklySchedule?: WeeklySchedule; // 曜日別診療時間
  access?: ClinicAccess;         // アクセス情報
  treatments?: Treatment[];      // 診療内容
  facilities?: Facility[];       // 設備・特徴
  announcements?: Announcement[]; // お知らせ
}
```

### 注意事項

- **ボリューム変更時はdown必須**: `docker compose down` してから `up` しないとボリュームが反映されない
- **Nginxキャッシュ**: アップロード画像は30日キャッシュ設定

### PR作成済み

- ブランチ: `claude/plan-qr-measurements-wb4qE`
- タイトル: `feat: 医院紹介ページの大幅強化と写真アップロード機能`

---

### 実装済み機能（以前のセッション）

#### アプリ名
- **くるくる診断DX for Dental**（「for Dental」は半分のサイズ）

#### QRコード計測機能
- **QRコード（Channel）管理**: 1QRコード = 1診断タイプ、画像添付可能
- **ダッシュボード統合**: QRコード一覧・統計サマリー・診断実施エリア・CTAグラフ・診断完了履歴を1画面に
- **統計フィルター**: 期間（今日/今週/今月/カスタム期間）、QRコード別
- **履歴表示**: 50件ずつページネーション、診断タイプフィルター、CSVエクスポート

#### 診断完了トラッキング
- 診断完了時に `DiagnosisSession` をDBに保存
- `channelId` から `clinicId` を自動取得して記録
- 結果画面表示時に `/api/track/complete` を呼び出し

#### 診断実施エリア表示（IP地域推定）
- IPアドレスから都道府県・市区町村を推定（ip-api.com使用）
- ダッシュボードに地図＋エリア別ランキング表示
- react-leaflet + OpenStreetMap

#### ダッシュボード構成
```
/dashboard
├── QRコードセクション（一覧・作成・編集・削除・サムネイル表示）
├── 統計サマリー（アクセス/完了/完了率/CTA/前期比トレンド）
├── 診断実施エリア（地図+TOP10リスト）
├── CTAクリック推移グラフ（診断結果/医院ページ別）
└── 診断完了履歴（50件ずつ、もっと見る、CSVエクスポート）
```

#### API
| エンドポイント | 説明 |
|---------------|------|
| `GET /api/dashboard/stats` | 統計データ（期間・QRコードフィルター対応） |
| `GET /api/dashboard/history` | 診断完了履歴（ページネーション対応） |
| `GET /api/dashboard/locations` | エリア別統計（地図表示用） |
| `GET /api/dashboard/cta-chart` | CTAクリック推移データ |
| `POST /api/track/complete` | 診断完了記録（位置情報含む） |
| `POST /api/track/access` | アクセス記録（位置情報含む） |
| `POST /api/track/cta` | CTAクリック記録 |
| `POST /api/track/clinic-cta` | 医院ページCTAクリック記録 |
| `POST /api/track/clinic-view` | 医院ページ閲覧記録 |
| `GET /api/channels` | QRコード一覧 |
| `POST /api/channels` | QRコード作成（diagnosisTypeSlug, imageUrl対応） |
| `GET /api/channels/[id]` | QRコード詳細 |
| `PATCH /api/channels/[id]` | QRコード更新 |
| `DELETE /api/channels/[id]` | QRコード削除 |

#### DBスキーマ（位置情報フィールド）
```prisma
model DiagnosisSession {
  // 位置情報（IPベース）
  ipAddress  String?  @map("ip_address")
  country    String?  // 国コード (JP)
  region     String?  // 都道府県 (兵庫県)
  city       String?  // 市区町村 (西宮市)
  latitude   Float?   // 緯度
  longitude  Float?   // 経度
}

model AccessLog {
  ipAddress  String?  @map("ip_address")
  country    String?
  region     String?
  city       String?
}
```

### 主要ファイル

| ファイル | 説明 |
|---------|------|
| `src/lib/geolocation.ts` | IP地域推定ライブラリ |
| `src/components/dashboard/location-section.tsx` | エリア表示セクション |
| `src/components/dashboard/location-map.tsx` | Leaflet地図コンポーネント |
| `src/components/diagnosis/result-card.tsx` | 結果表示＋完了トラッキング |
| `docs/SPEC_LOCATION_TRACKING.md` | エリア表示機能の仕様書 |

### ナビゲーション構成
- ダッシュボード（QRコード・統計・エリア・履歴を統合）
- QRコード作成（旧: 埋め込みコード）
- 医院紹介
- 設定
- 契約・お支払い

### 削除されたページ
- `/dashboard/channels` → ダッシュボードに統合

### 今後の開発候補
- ~~統計データのCSVエクスポート~~ → 実装済み
- ~~グラフ表示（推移チャート）~~ → 実装済み（CTAクリック推移グラフ）
- QRコード別の詳細統計ページ
- 画像の圧縮・リサイズ最適化（現在はBase64保存）
- ランディングページの「経路」用語更新

### 注意事項
- **DBマイグレーション必須**: 位置情報フィールドを追加したため、本番デプロイ時は `prisma db push` が必要
- **IP地域推定の制限**: ip-api.com は 45req/分。高トラフィック時は有料サービスへの移行を検討

---

## 運営会社情報

- 会社名: 株式会社ファンクション・ティ
- URL: https://function-t.com/
- 代表: 田尾耕太郎
- 所在地: 兵庫県西宮市北名次町5-9-301
- メール: mail@function-t.com
