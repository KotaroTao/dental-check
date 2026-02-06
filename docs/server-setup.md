# dental-check サーバー構築手順書

別サーバーへの移行・災害復旧時に使用する手順書です。

## 前提環境

| 項目 | バージョン |
|------|-----------|
| OS | Ubuntu 25.04 |
| Node.js | v20.20.0 |
| npm | 10.8.2 |
| PostgreSQL | 17.x |
| nginx | 1.26.x |
| PM2 | 6.0.x |

---

## 1. 基本パッケージのインストール

```bash
# システム更新
apt update && apt upgrade -y

# 必須パッケージ
apt install -y curl git build-essential

# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PM2
npm install -g pm2

# nginx
apt install -y nginx

# PostgreSQL 17
apt install -y postgresql-17 postgresql-client-17

# sharp依存ライブラリ（画像処理用）
apt install -y libvips-dev
```

## 2. PostgreSQL セットアップ

```bash
# PostgreSQLサービス起動
systemctl enable postgresql
systemctl start postgresql

# ユーザーとデータベース作成
sudo -u postgres psql <<EOF
CREATE USER dental_user WITH PASSWORD 'DentalCheck2025Secure';
CREATE DATABASE dental_check OWNER dental_user;
GRANT ALL PRIVILEGES ON DATABASE dental_check TO dental_user;
EOF

# パスワード認証を有効化（pg_hba.conf）
# local/host の認証方式を md5 または scram-sha-256 に設定
```

## 3. バックアップからの復元

```bash
# バックアップを展開
cd ~/backups
tar xzf YYYYMMDD_HHMMSS.tar.gz
cd YYYYMMDD_HHMMSS

# データベース復元
export PGPASSWORD="DentalCheck2025Secure"
pg_restore -h localhost -U dental_user -d dental_check --clean --if-exists database.dump

# アプリケーションコードを配置
mkdir -p /var/www/dental-check
cd /var/www/dental-check
git clone https://github.com/KotaroTao/dental-check.git .

# Gitコミットを確認して同じバージョンにチェックアウト
cat ~/backups/YYYYMMDD_HHMMSS/git_commit.txt
# git checkout <表示されたコミットハッシュ>

# ローカル変更があれば適用
git apply ~/backups/YYYYMMDD_HHMMSS/local_changes.patch 2>/dev/null

# 環境変数を復元（DATABASE_URLは新サーバーに合わせて修正）
cp ~/backups/YYYYMMDD_HHMMSS/env_backup /var/www/dental-check/.env
# vi /var/www/dental-check/.env  # 必要に応じて編集

# アップロード画像を復元
tar xzf ~/backups/YYYYMMDD_HHMMSS/uploads.tar.gz -C /var/www/dental-check/public/

# 依存パッケージインストール
cd /var/www/dental-check
npm install

# Prismaクライアント生成 & DBスキーマ同期
npx prisma generate
npx prisma db push

# ビルド
npm run build
```

## 4. nginx 設定

```bash
# バックアップからnginx設定を復元
cp ~/backups/YYYYMMDD_HHMMSS/server_config/dental-check /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/dental-check /etc/nginx/sites-enabled/

# ドメイン名・IPアドレスを新サーバーに合わせて修正
vi /etc/nginx/sites-available/dental-check

# 設定テスト & 再起動
nginx -t && systemctl restart nginx
```

## 5. SSL証明書（Let's Encrypt）

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

## 6. PM2でアプリケーション起動

```bash
cd /var/www/dental-check

# PM2設定を復元するか、新規起動
# 方法A: バックアップから復元
cp ~/backups/YYYYMMDD_HHMMSS/server_config/dump.pm2 ~/.pm2/
pm2 resurrect

# 方法B: 新規起動
pm2 start npm --name dental-app -- start
pm2 save
pm2 startup  # システム起動時の自動起動設定
```

## 7. バックアップスクリプト復元

```bash
cp ~/backups/YYYYMMDD_HHMMSS/server_config/backup_dental.sh ~/
chmod +x ~/backup_dental.sh

# cron登録（毎日3:00 AM）
(crontab -l 2>/dev/null; echo "0 3 * * * /root/backup_dental.sh") | crontab -
```

## 8. 動作確認チェックリスト

- [ ] `curl http://localhost:3000/api/health` が正常応答を返す
- [ ] ブラウザでサイトにアクセスできる
- [ ] 管理者ログインができる
- [ ] 医院一覧が表示される
- [ ] アップロード画像が表示される（ロゴ、チャネル画像など）
- [ ] QRコード読み取り → 診断フローが動作する
- [ ] バックアップスクリプトのテスト実行が成功する

## 補足: .env に必要な環境変数

| 変数名 | 説明 |
|--------|------|
| DATABASE_URL | PostgreSQL接続文字列 |
| JWT_SECRET | JWT署名鍵 |
| NEXT_PUBLIC_APP_URL | アプリのURL |
| PAYJP_SECRET_KEY | PAY.JP決済キー |
| PAYJP_PUBLIC_KEY | PAY.JP公開キー |

---

最終更新: 2026-02-07
