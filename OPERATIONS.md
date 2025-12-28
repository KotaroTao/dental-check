# くるくる診断DX for Dental - 運用手順書

## 本番環境構成（Xserver VPS）

### サーバー情報

| 項目 | 値 |
|------|-----|
| ドメイン | qrqr-dental.com |
| サーバーIP | 210.131.223.161 |
| サーバー種別 | Xserver VPS |
| OS | Ubuntu |

### 構成図

```
[GitHub]
    ↓ git push (main/masterブランチ)
[GitHub Actions]
    ↓ SSH自動デプロイ
[Xserver VPS]
├── Nginx ← SSL終端 + リバースプロキシ + 静的ファイル
├── PM2 + Node.js 20 ← Next.jsアプリ (ポート3000)
└── PostgreSQL 15 ← データベース (ポート5432)
```

### デプロイ方法

**自動デプロイ（推奨）:**
```bash
git push origin main
# → GitHub Actionsが自動でデプロイ実行
```

**手動デプロイ（緊急時のみ）:**
```bash
ssh -i ~/Downloads/dental-check-key.pem root@210.131.223.161
cd /var/www/dental-check
git pull origin main
npm install --production
npm run build
pm2 restart dental-app
```

---

## SSH接続

### Windows PowerShell
```powershell
ssh -i $env:USERPROFILE\Downloads\dental-check-key.pem root@210.131.223.161
```

### Mac/Linux
```bash
ssh -i ~/Downloads/dental-check-key.pem root@210.131.223.161
```

---

## プロジェクトパス

```bash
cd /var/www/dental-check
```

---

## PM2コマンド

### アプリ状態確認
```bash
pm2 status
```

### ログ確認
```bash
# 全ログ
pm2 logs dental-app

# 直近100行
pm2 logs dental-app --lines 100

# リアルタイム監視
pm2 monit
```

### アプリ再起動
```bash
pm2 restart dental-app
```

### アプリ停止・起動
```bash
pm2 stop dental-app
pm2 start dental-app
```

---

## Nginxコマンド

### 設定テスト
```bash
nginx -t
```

### 再読み込み
```bash
systemctl reload nginx
```

### 再起動
```bash
systemctl restart nginx
```

### ログ確認
```bash
# アクセスログ
tail -f /var/log/nginx/access.log

# エラーログ
tail -f /var/log/nginx/error.log
```

---

## データベース操作

### 接続情報

| 項目 | 値 |
|------|-----|
| ホスト | localhost |
| ポート | 5432 |
| ユーザー | dental_user |
| データベース | dental_check |
| パスワード | .envファイル参照 |

### PostgreSQLに接続
```bash
sudo -u postgres psql -d dental_check
```

### マイグレーション実行
```bash
cd /var/www/dental-check
npx prisma db push
```

### バックアップ
```bash
pg_dump -U dental_user -d dental_check > /var/backups/dental_$(date +%Y%m%d).sql
```

### リストア
```bash
psql -U dental_user -d dental_check < /var/backups/dental_YYYYMMDD.sql
```

---

## SSL証明書

### 証明書更新（自動更新設定済み）
```bash
certbot renew
```

### 証明書状態確認
```bash
certbot certificates
```

---

## 管理画面

| 項目 | 値 |
|------|-----|
| URL | https://qrqr-dental.com/admin/login |

---

## 環境変数

`/var/www/dental-check/.env` に設定:

| 変数名 | 説明 |
|--------|------|
| DATABASE_URL | PostgreSQL接続文字列 |
| JWT_SECRET | JWT署名用シークレット |
| NEXT_PUBLIC_APP_URL | アプリのURL |
| PAYJP_SECRET_KEY | Pay.jp シークレットキー |
| PAYJP_WEBHOOK_SECRET | Pay.jp Webhookシークレット |
| NEXT_PUBLIC_PAYJP_PUBLIC_KEY | Pay.jp 公開キー |

---

## GitHub Actions

### 設定ファイル
`.github/workflows/deploy.yml`

### 必要なSecrets（GitHub Settings → Secrets）

| Secret名 | 説明 |
|----------|------|
| VPS_HOST | サーバーIP (210.131.223.161) |
| VPS_USER | SSHユーザー (root) |
| VPS_SSH_KEY | SSH秘密鍵の内容 |
| VPS_PORT | SSHポート (22) |

### デプロイ状況確認
GitHubリポジトリ → Actions タブ

---

## トラブルシューティング

### アプリが起動しない
```bash
# PM2ログ確認
pm2 logs dental-app --lines 200

# プロセス状態確認
pm2 status

# 手動で起動テスト
cd /var/www/dental-check
node .next/standalone/server.js
```

### 502 Bad Gateway
```bash
# アプリが起動しているか確認
pm2 status

# Nginx設定確認
nginx -t

# ポート3000が使われているか確認
lsof -i :3000
```

### ディスク容量確認
```bash
df -h
```

### メモリ確認
```bash
free -h
```

---

## Windows PC 開発環境

### プロジェクトパス
```
C:\Users\hacha\Documents\dental-check
```

### 起動方法（コマンドプロンプト）
```cmd
cd C:\Users\hacha\Documents\dental-check
npm run dev -- -p 3002
```

### ローカルDB（Docker）

**起動:**
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
```
DATABASE_URL="postgresql://dental_user:localpass@localhost:5433/dental_check"
JWT_SECRET="qrqr-dental-jwt-secret-key-2025-very-long-random-string-here"
NEXT_PUBLIC_APP_URL="http://localhost:3002"
```

---

## クラウド開発環境（Claude Code）

### プロジェクトパス
```
/home/user/dental-check
```

### 起動方法
```bash
npm install
npm run dev -- -p 3001
```

---

## Git ブランチ

- 本番ブランチ: `main`
- リポジトリ: `https://github.com/KotaroTao/dental-check`

### 開発→本番 反映手順

```bash
# 1. 開発ブランチで作業
git checkout -b feature/xxx

# 2. コミット＆プッシュ
git add .
git commit -m "修正内容"
git push origin feature/xxx

# 3. PRを作成してmainにマージ
# → マージ後、自動でデプロイされる
```

---

## 運営会社情報

- 会社名: 株式会社ファンクション・ティ
- URL: https://function-t.com/
- 代表: 田尾耕太郎
- 所在地: 兵庫県西宮市北名次町5-9-301
- メール: mail@function-t.com

---

---

# 移行手順書（Docker → Dockerなし構成）

以下は、現在のDocker構成から新しいDockerなし構成への移行手順です。

## 事前準備

### 1. 本番DBのバックアップ
```bash
ssh -i ~/Downloads/dental-check-key.pem root@210.131.223.161
cd /var/www/dental-check
docker exec dental-check-db pg_dump -U dental_user -d dental_check > backup_$(date +%Y%m%d).sql
```

### 2. 現在の環境変数を控える
```bash
cat .env.production
```

---

## 移行手順

### Step 1: Node.js 20 インストール

```bash
# NodeSourceリポジトリ追加
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.jsインストール
sudo apt-get install -y nodejs

# バージョン確認
node -v  # v20.x.x
npm -v
```

### Step 2: PM2 インストール

```bash
# PM2をグローバルインストール
sudo npm install -g pm2

# 自動起動設定
pm2 startup systemd
```

### Step 3: PostgreSQL インストール・データ移行

```bash
# PostgreSQL 15 インストール
sudo apt-get install -y postgresql-15 postgresql-contrib-15

# PostgreSQL起動
sudo systemctl start postgresql
sudo systemctl enable postgresql

# ユーザー・データベース作成
sudo -u postgres psql << EOF
CREATE USER dental_user WITH PASSWORD 'YOUR_PASSWORD_HERE';
CREATE DATABASE dental_check OWNER dental_user;
GRANT ALL PRIVILEGES ON DATABASE dental_check TO dental_user;
EOF

# データインポート
sudo -u postgres psql -d dental_check < /var/www/dental-check/backup_YYYYMMDD.sql

# 権限付与
sudo -u postgres psql -d dental_check << EOF
GRANT ALL ON ALL TABLES IN SCHEMA public TO dental_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO dental_user;
EOF
```

### Step 4: Nginx 設定

```bash
# Nginxインストール（まだの場合）
sudo apt-get install -y nginx

# Certbotインストール（まだの場合）
sudo apt-get install -y certbot python3-certbot-nginx
```

**Nginx設定ファイル作成:**
```bash
sudo nano /etc/nginx/sites-available/dental-check
```

以下を記述:
```nginx
server {
    listen 80;
    server_name qrqr-dental.com www.qrqr-dental.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name qrqr-dental.com www.qrqr-dental.com;

    ssl_certificate /etc/letsencrypt/live/qrqr-dental.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/qrqr-dental.com/privkey.pem;

    # アップロードファイル
    location /uploads/ {
        alias /var/www/dental-check/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 静的ファイル
    location /_next/static/ {
        alias /var/www/dental-check/.next/static/;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Next.jsアプリへプロキシ
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 有効化
sudo ln -s /etc/nginx/sites-available/dental-check /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # デフォルト削除

# 設定テスト
sudo nginx -t

# 再起動
sudo systemctl restart nginx
```

### Step 5: 環境変数設定

```bash
cd /var/www/dental-check
nano .env
```

以下を記述:
```env
DATABASE_URL="postgresql://dental_user:YOUR_PASSWORD@localhost:5432/dental_check"
JWT_SECRET="your-jwt-secret"
NEXT_PUBLIC_APP_URL="https://qrqr-dental.com"
PAYJP_SECRET_KEY="sk_xxx"
PAYJP_WEBHOOK_SECRET="whsec_xxx"
NEXT_PUBLIC_PAYJP_PUBLIC_KEY="pk_xxx"
```

### Step 6: アプリビルド・起動

```bash
cd /var/www/dental-check

# 依存関係インストール
npm install --production

# Prismaクライアント生成
npx prisma generate

# ビルド
npm run build

# PM2で起動
pm2 start npm --name "dental-app" -- start

# 状態確認
pm2 status

# 自動起動設定を保存
pm2 save
```

### Step 7: 動作確認

```bash
# ヘルスチェック
curl -I https://qrqr-dental.com

# ログ確認
pm2 logs dental-app
```

### Step 8: GitHub Actions 設定

1. GitHubリポジトリ → Settings → Secrets and variables → Actions
2. 以下のSecretsを追加:
   - `VPS_HOST`: `210.131.223.161`
   - `VPS_USER`: `root`
   - `VPS_SSH_KEY`: SSH秘密鍵の内容（`cat dental-check-key.pem`）
   - `VPS_PORT`: `22`

### Step 9: Dockerコンテナ停止・削除

```bash
# Dockerコンテナ停止
docker compose -f docker-compose.production.yml --env-file .env.production down

# 不要なDockerリソース削除
docker system prune -a
```

---

## 移行後の確認チェックリスト

- [ ] https://qrqr-dental.com にアクセスできる
- [ ] 管理画面にログインできる
- [ ] 診断が実行できる
- [ ] 画像アップロードが動作する
- [ ] `git push origin main` で自動デプロイされる
- [ ] PM2でアプリが自動起動する（`pm2 status`）

---

## ロールバック手順（問題発生時）

```bash
# Dockerコンテナを再起動
cd /var/www/dental-check
docker compose -f docker-compose.production.yml --env-file .env.production up -d
```
