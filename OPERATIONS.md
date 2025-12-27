# くるくる診断 for Dental - 運用手順書

## Windows PC 開発環境

### プロジェクトパス
```
C:\Users\hacha\Documents\dental-check
```

### 起動方法（コマンドプロンプト）
```cmd
cd C:\Users\hacha\Documents\dental-check
npm install
npm run dev -- -p 3002
```
※ PowerShellでは実行ポリシーエラーが出るため、コマンドプロンプト(cmd)を使用

### アクセスURL

| 画面 | URL |
|------|-----|
| トップページ | http://localhost:3002 |
| 医院ログイン | http://localhost:3002/login |
| 医院ダッシュボード | http://localhost:3002/dashboard |
| 管理者ログイン | http://localhost:3002/admin/login |
| 管理者ダッシュボード | http://localhost:3002/admin/diagnoses |

### ローカルDB（Docker）

```cmd
docker run -d --name dental-local-db -e POSTGRES_USER=dental_user -e POSTGRES_PASSWORD=localpass -e POSTGRES_DB=dental_check -p 5433:5432 postgres:15
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

### 管理者アカウント作成（Windows）
```cmd
cd C:\Users\hacha\Documents\dental-check
set ADMIN_EMAIL=mail@function-t.com
set ADMIN_PASSWORD=MUNP1687
node scripts/create-admin.js
```

### 本番DBからデータを同期
```cmd
cd C:\Users\hacha\Downloads
scp -i dental-check-key.pem root@210.131.223.161:/var/www/dental-check/backup.sql ./backup.sql
Get-Content backup.sql | docker exec -i dental-local-db psql -U dental_user -d dental_check
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

### ビルド＆デプロイ
```bash
cd /var/www/dental-check
git pull origin claude/dental-clinic-tool-dev-FVPKz
docker compose -f docker-compose.production.yml --env-file .env.production build --no-cache
docker compose -f docker-compose.production.yml --env-file .env.production up -d
```

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

- 開発ブランチ: `claude/dental-clinic-tool-dev-FVPKz`
- リポジトリ: `https://github.com/KotaroTao/dental-check`

### ローカル→本番 反映手順（クイックリファレンス）

1. **ローカルで修正をコミット＆プッシュ**
```bash
git add .
git commit -m "修正内容"
git push origin claude/dental-clinic-tool-dev-FVPKz
```

2. **本番サーバーにSSH接続**
```bash
ssh -i ~/Downloads/dental-check-key.pem root@210.131.223.161
```

3. **本番サーバーでデプロイ**
```bash
cd /var/www/dental-check
git pull origin claude/dental-clinic-tool-dev-FVPKz
docker compose -f docker-compose.production.yml --env-file .env.production build --no-cache
docker compose -f docker-compose.production.yml --env-file .env.production up -d
```

### セッション間で引き継ぐ情報

作業を中断・再開する際は、以下を確認：
- 現在のブランチ: `git branch --show-current`
- 未コミットの変更: `git status`
- リモートとの差分: `git fetch origin && git status`

## 運営会社情報

- 会社名: 株式会社ファンクション・ティ
- URL: https://function-t.com/
- 代表: 田尾耕太郎
- 所在地: 兵庫県西宮市北名次町5-9-301
- メール: mail@function-t.com
