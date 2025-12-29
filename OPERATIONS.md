# くるくる診断DX for Dental - 運用手順書

## 本番環境構成（Xserver VPS）

### サーバー情報

| 項目 | 値 |
|------|-----|
| ドメイン | qrqr-dental.com |
| サーバーIP | 210.131.223.161 |
| サーバー種別 | Xserver VPS |
| OS | Ubuntu 25.04 |

### 構成図

```
[GitHub]
    ↓ git push (mainブランチ)
[GitHub Actions]
    ↓ SSH自動デプロイ
[Xserver VPS]
├── Nginx ← SSL終端 + リバースプロキシ + 静的ファイル
├── PM2 + Node.js 20 ← Next.jsアプリ (ポート3000)
└── PostgreSQL 17 ← データベース (ポート5432)
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
npm install
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

### 設定ファイル
```
/etc/nginx/sites-available/dental-check
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

### 手動バックアップ
```bash
sudo -u postgres pg_dump dental_check > /var/backups/dental-check/dental_$(date +%Y%m%d_%H%M%S).sql
```

### リストア
```bash
sudo -u postgres psql -d dental_check < /var/backups/dental-check/dental_YYYYMMDD_HHMMSS.sql
```

---

## 自動バックアップ

### 設定内容

| 項目 | 値 |
|------|-----|
| 実行時刻 | 毎日 午前3時 |
| 保存場所 | `/var/backups/dental-check/` |
| 保持期間 | 30日間（古いものは自動削除） |
| ログ | `/var/log/dental-backup.log` |

### バックアップ確認
```bash
ls -la /var/backups/dental-check/
```

### バックアップログ確認
```bash
tail -f /var/log/dental-backup.log
```

### バックアップスクリプト
```
/var/www/dental-check/scripts/backup-db.sh
```

### 手動実行
```bash
/var/www/dental-check/scripts/backup-db.sh
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

### 管理画面メニュー

| ページ | URL | 説明 |
|--------|-----|------|
| ダッシュボード | /admin/stats | 統計情報 |
| 医院管理 | /admin/clinics | 医院一覧・プラン変更 |
| 診断管理 | /admin/diagnoses | 診断コンテンツ管理 |

---

## 料金プラン

### プラン一覧

| プラン | 月額（税別） | QRコード上限 | 特徴 |
|--------|-------------|-------------|------|
| スターター | ¥4,980 | 2枚 | 基本機能 |
| スタンダード | ¥8,800 | 無制限 | CSVエクスポート |
| カスタム | ¥13,800 | 無制限 | オリジナル診断作成 |
| マネージド | ¥24,800 | 無制限 | カスタム+専任サポート+月次レポート |
| 特別（無料・無制限） | ¥0 | 無制限 | 管理者設定のみ |

### プラン変更（管理者）

1. 管理画面にログイン: https://qrqr-dental.com/admin/login
2. 「医院管理」メニューを選択
3. 対象医院の「プラン変更」から変更

### トライアル期間

- 期間: 14日間
- トライアル中はスタータープラン相当
- トライアル終了後3日間の猶予期間あり

### 契約期間切れ時の動作

1. **猶予期間中（3日間）**: ログイン可能、QRコード作成不可、トラッキング停止
2. **猶予期間終了後**: ログイン可能、データ閲覧のみ可能

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
npm start
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

### サーバー再起動
```bash
reboot
# → PM2は自動起動設定済み
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
