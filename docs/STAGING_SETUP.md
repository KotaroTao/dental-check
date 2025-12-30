# ステージング環境セットアップガイド

## 概要

本番環境と同じ構成でテストを行い、問題がないことを確認してから本番環境に適用する仕組みです。

## アーキテクチャ

```
[iPad/ブラウザ]
    │
    ├─────────────────────────────────────────────────┐
    │                                                 │
    ▼                                                 ▼
[staging.qrqr-dental.com]                    [qrqr-dental.com]
    │                                                 │
    ▼                                                 ▼
[Xserver VPS]                                 [Xserver VPS]
├── Nginx (ポート 80/443)                    ├── Nginx (ポート 80/443)
├── PM2 + Node.js (ポート 3001)              ├── PM2 + Node.js (ポート 3000)
└── PostgreSQL (dental_staging)              └── PostgreSQL (dental_check)
```

## GitHubフロー

```
[feature/xxx ブランチ] ─────┐
                            │
                            ▼
                     [develop ブランチ]
                            │
                            │ git push
                            ▼
                  [GitHub Actions: deploy-staging.yml]
                            │
                            ▼
                  [staging.qrqr-dental.com]
                            │
                            │ ✅ テスト完了
                            ▼
                     [main ブランチ]
                            │
                            │ git push / PR マージ
                            ▼
                  [GitHub Actions: deploy.yml]
                            │
                            ▼
                     [qrqr-dental.com]
```

## 運用フロー（iPad対応）

### 1. 開発・テスト

1. `feature/xxx` ブランチで開発
2. `develop` ブランチにマージ（GitHub上でPR作成・マージ）
3. 自動でステージング環境にデプロイ
4. **iPadでステージング環境をテスト**: `https://staging.qrqr-dental.com`

### 2. 本番適用

1. iPadでの動作確認完了後
2. `develop` → `main` へPR作成・マージ
3. 自動で本番環境にデプロイ
4. 本番環境で最終確認: `https://qrqr-dental.com`

---

## サーバー設定

### 環境一覧

| 項目 | ステージング | 本番 |
|------|-------------|------|
| URL | https://staging.qrqr-dental.com | https://qrqr-dental.com |
| ブランチ | develop | main |
| ポート | 3001 | 3000 |
| PM2アプリ名 | dental-staging | dental-app |
| データベース | dental_staging | dental_check |
| プロジェクトパス | /var/www/dental-staging | /var/www/dental-check |

### GitHub Secrets（追加設定）

ステージング環境用のSecretsは本番と共通で使用可能です。

| Secret名 | 説明 | 設定済み |
|----------|------|----------|
| VPS_HOST | サーバーIP | ✅ |
| VPS_USER | SSHユーザー | ✅ |
| VPS_SSH_KEY | SSH秘密鍵 | ✅ |
| VPS_PORT | SSHポート | ✅ |

---

## 初回セットアップ手順

### 1. サブドメイン設定（エックスサーバー管理画面）

1. エックスサーバーのサーバーパネルにログイン
2. 「DNS設定」→「DNSレコード追加」
3. 以下のレコードを追加:

```
ホスト名: staging
種別: A
内容: 210.131.223.161
```

### 2. SSL証明書取得

```bash
# サーバーにSSH接続
ssh -i ~/Downloads/dental-check-key.pem root@210.131.223.161

# Let's Encrypt証明書を取得
certbot certonly --nginx -d staging.qrqr-dental.com
```

### 3. ステージング用データベース作成

```bash
# PostgreSQLに接続
sudo -u postgres psql

# データベース作成
CREATE DATABASE dental_staging;
GRANT ALL PRIVILEGES ON DATABASE dental_staging TO dental_user;
\q
```

### 4. ステージング用プロジェクトディレクトリ作成

```bash
# ディレクトリ作成
mkdir -p /var/www/dental-staging
cd /var/www/dental-staging

# GitHubからクローン
git clone https://github.com/KotaroTao/dental-check.git .

# developブランチに切り替え
git checkout develop

# 環境変数ファイル作成（後述のテンプレートを使用）
nano .env

# 依存関係インストール
npm install

# Prismaクライアント生成 & マイグレーション
npx prisma generate
npx prisma db push

# シードデータ投入（必要に応じて）
npm run db:seed

# ビルド
npm run build

# PM2で起動
pm2 start npm --name "dental-staging" -- start -- -p 3001
pm2 save
```

### 5. Nginx設定

```bash
# 設定ファイルコピー
cp /etc/nginx/sites-available/dental-check /etc/nginx/sites-available/dental-staging

# 設定編集（後述の設定を参照）
nano /etc/nginx/sites-available/dental-staging

# シンボリックリンク作成
ln -s /etc/nginx/sites-available/dental-staging /etc/nginx/sites-enabled/

# 設定テスト
nginx -t

# Nginx再読み込み
systemctl reload nginx
```

---

## 環境変数設定（ステージング用）

`/var/www/dental-staging/.env`:

```bash
# データベース（ステージング専用DB）
DATABASE_URL="postgresql://dental_user:YOUR_PASSWORD@localhost:5432/dental_staging"

# アプリURL（ステージングドメイン）
NEXT_PUBLIC_APP_URL="https://staging.qrqr-dental.com"

# JWT（本番と別のシークレット推奨）
JWT_SECRET="staging-jwt-secret-key-2025-very-long-random-string-here"

# Pay.jp（テスト環境のキーを使用）
PAYJP_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_PAYJP_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
PAYJP_WEBHOOK_SECRET=whsec_test_xxxxxxxxxxxxxxxxxxxxx
PAYJP_PLAN_ID=dental_check_monthly

# Google Maps API（任意）
GOOGLE_MAPS_API_KEY=your_api_key_here
```

**重要**: Pay.jpはテスト用キー（`sk_test_`/`pk_test_`）を使用すること！

---

## Nginx設定（ステージング用）

`/etc/nginx/sites-available/dental-staging`:

```nginx
# ステージング環境設定
upstream dental_staging {
    server 127.0.0.1:3001;
}

# HTTP → HTTPS リダイレクト
server {
    listen 80;
    server_name staging.qrqr-dental.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name staging.qrqr-dental.com;

    # SSL証明書
    ssl_certificate /etc/letsencrypt/live/staging.qrqr-dental.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.qrqr-dental.com/privkey.pem;

    # SSL設定
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    # セキュリティヘッダー
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # ステージング環境識別ヘッダー
    add_header X-Environment "staging" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # プロキシ設定
    location / {
        proxy_pass http://dental_staging;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静的ファイル
    location /_next/static {
        proxy_pass http://dental_staging;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # ヘルスチェック
    location /api/health {
        proxy_pass http://dental_staging;
    }
}
```

---

## PM2設定

両環境を管理するエコシステム設定ファイル:

`/var/www/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'dental-app',
      cwd: '/var/www/dental-check',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'dental-staging',
      cwd: '/var/www/dental-staging',
      script: 'npm',
      args: 'start -- -p 3001',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
```

---

## デプロイコマンド

### 手動デプロイ

```bash
# ステージング
ssh -i ~/Downloads/dental-check-key.pem root@210.131.223.161
cd /var/www/dental-staging
git pull origin develop
npm install
npx prisma generate
npm run build
pm2 restart dental-staging

# 本番
cd /var/www/dental-check
git pull origin main
npm install
npx prisma generate
npm run build
pm2 restart dental-app
```

### 自動デプロイ（GitHub Actions）

- `develop` ブランチにpush → ステージングに自動デプロイ
- `main` ブランチにpush → 本番に自動デプロイ

---

## トラブルシューティング

### ステージング環境が表示されない

```bash
# PM2状態確認
pm2 status

# ステージングアプリのログ確認
pm2 logs dental-staging --lines 100

# Nginx設定テスト
nginx -t

# ポート確認
lsof -i :3001
```

### データベース接続エラー

```bash
# PostgreSQL接続確認
sudo -u postgres psql -d dental_staging -c "SELECT 1;"

# 接続文字列確認
cat /var/www/dental-staging/.env | grep DATABASE_URL
```

### SSL証明書エラー

```bash
# 証明書状態確認
certbot certificates

# 証明書更新
certbot renew

# Nginx再読み込み
systemctl reload nginx
```

---

## 本番適用チェックリスト

ステージング環境でのテスト完了後、本番適用前に以下を確認:

- [ ] 全ページが正常に表示される
- [ ] QRコード生成が動作する
- [ ] 診断フローが完了できる
- [ ] ダッシュボードにデータが表示される
- [ ] Pay.jp決済フローが動作する（テストモード）
- [ ] iPadでの表示・操作に問題がない
- [ ] 管理画面が正常に動作する
- [ ] レスポンシブデザインが崩れていない

チェック完了後、`develop` → `main` へPRを作成してマージ。

---

## 料金・リソース

### エックスサーバーVPS

同一VPS内でステージング・本番を運用するため、追加料金なし。

### リソース使用量（目安）

| リソース | ステージング | 本番 | 合計 |
|---------|-------------|------|------|
| メモリ | 512MB | 1GB | 1.5GB |
| ディスク | 2GB | 5GB | 7GB |
| PM2プロセス | 1 | 1 | 2 |

---

## 連絡先

問題が発生した場合:
- メール: mail@function-t.com
- GitHub Issues: https://github.com/KotaroTao/dental-check/issues
