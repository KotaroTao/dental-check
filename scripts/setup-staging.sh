#!/bin/bash
#
# ステージング環境セットアップスクリプト
#
# 使用方法:
#   1. サーバーにSSH接続
#   2. このスクリプトを実行: bash /var/www/dental-check/scripts/setup-staging.sh
#
# 前提条件:
#   - 本番環境が既に動作している
#   - staging.qrqr-dental.com のDNS設定が完了している
#

set -e

echo "=========================================="
echo "ステージング環境セットアップ開始"
echo "=========================================="

# 変数設定
STAGING_DIR="/var/www/dental-staging"
STAGING_DB="dental_staging"
STAGING_DOMAIN="staging.qrqr-dental.com"
GITHUB_REPO="https://github.com/KotaroTao/dental-check.git"
DB_USER="dental_user"

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ステップ 1: ディレクトリ作成
echo ""
log_info "ステップ 1: プロジェクトディレクトリ作成"
echo "----------------------------------------"

if [ -d "$STAGING_DIR" ]; then
    log_warn "ディレクトリが既に存在します: $STAGING_DIR"
    read -p "既存のディレクトリを削除しますか? (y/N): " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        rm -rf "$STAGING_DIR"
        log_info "既存ディレクトリを削除しました"
    else
        log_error "セットアップを中止します"
        exit 1
    fi
fi

mkdir -p "$STAGING_DIR"
log_info "ディレクトリを作成しました: $STAGING_DIR"

# ステップ 2: GitHubからクローン
echo ""
log_info "ステップ 2: GitHubからクローン"
echo "----------------------------------------"

cd "$STAGING_DIR"
git clone "$GITHUB_REPO" .
git checkout develop || git checkout -b develop origin/develop

log_info "developブランチをチェックアウトしました"

# ステップ 3: データベース作成
echo ""
log_info "ステップ 3: ステージング用データベース作成"
echo "----------------------------------------"

# データベースが存在するか確認
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$STAGING_DB"; then
    log_warn "データベースが既に存在します: $STAGING_DB"
else
    sudo -u postgres psql -c "CREATE DATABASE $STAGING_DB;"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $STAGING_DB TO $DB_USER;"
    log_info "データベースを作成しました: $STAGING_DB"
fi

# ステップ 4: 環境変数ファイル作成
echo ""
log_info "ステップ 4: 環境変数ファイル作成"
echo "----------------------------------------"

if [ -f "$STAGING_DIR/.env" ]; then
    log_warn ".env ファイルが既に存在します"
else
    # 本番環境からパスワードを取得（オプション）
    PROD_ENV="/var/www/dental-check/.env"
    if [ -f "$PROD_ENV" ]; then
        DB_PASSWORD=$(grep "DATABASE_URL" "$PROD_ENV" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    else
        DB_PASSWORD="your_password_here"
    fi

    cat > "$STAGING_DIR/.env" << EOF
# ステージング環境設定
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${STAGING_DB}"
NEXT_PUBLIC_APP_URL="https://${STAGING_DOMAIN}"
JWT_SECRET="staging-jwt-secret-key-2025-$(openssl rand -hex 20)"

# Pay.jp テスト環境
# 重要: 実際のテストキーに置き換えてください
PAYJP_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_PAYJP_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
PAYJP_WEBHOOK_SECRET=whsec_test_xxxxxxxxxxxxxxxxxxxxx
PAYJP_PLAN_ID=dental_check_monthly
EOF

    log_info ".env ファイルを作成しました"
    log_warn "Pay.jp のテストキーを設定してください: nano $STAGING_DIR/.env"
fi

# ステップ 5: 依存関係インストール
echo ""
log_info "ステップ 5: npm 依存関係インストール"
echo "----------------------------------------"

cd "$STAGING_DIR"
npm install

# ステップ 6: Prisma セットアップ
echo ""
log_info "ステップ 6: Prisma セットアップ"
echo "----------------------------------------"

npx prisma generate
npx prisma db push

# シードデータ投入（任意）
read -p "シードデータを投入しますか? (y/N): " seed_confirm
if [ "$seed_confirm" = "y" ] || [ "$seed_confirm" = "Y" ]; then
    npm run db:seed
    log_info "シードデータを投入しました"
fi

# ステップ 7: ビルド
echo ""
log_info "ステップ 7: Next.js ビルド"
echo "----------------------------------------"

npm run build

# ステップ 8: SSL証明書取得
echo ""
log_info "ステップ 8: SSL証明書取得"
echo "----------------------------------------"

if [ -f "/etc/letsencrypt/live/$STAGING_DOMAIN/fullchain.pem" ]; then
    log_info "SSL証明書は既に存在します"
else
    log_info "Let's Encrypt証明書を取得します..."
    certbot certonly --nginx -d "$STAGING_DOMAIN" --non-interactive --agree-tos --email mail@function-t.com || {
        log_warn "SSL証明書の取得に失敗しました。DNSの設定を確認してください。"
        log_warn "後で手動で実行: certbot certonly --nginx -d $STAGING_DOMAIN"
    }
fi

# ステップ 9: Nginx設定
echo ""
log_info "ステップ 9: Nginx設定"
echo "----------------------------------------"

NGINX_STAGING_CONF="/etc/nginx/sites-available/dental-staging"
if [ -f "$NGINX_STAGING_CONF" ]; then
    log_warn "Nginx設定が既に存在します"
else
    cp "$STAGING_DIR/nginx/nginx-staging.conf" "$NGINX_STAGING_CONF"
    ln -sf "$NGINX_STAGING_CONF" /etc/nginx/sites-enabled/

    # 設定テスト
    if nginx -t; then
        systemctl reload nginx
        log_info "Nginx設定を適用しました"
    else
        log_error "Nginx設定にエラーがあります"
        exit 1
    fi
fi

# ステップ 10: PM2でアプリ起動
echo ""
log_info "ステップ 10: PM2でアプリ起動"
echo "----------------------------------------"

# 既存のプロセスがあれば停止
pm2 delete dental-staging 2>/dev/null || true

# PM2ログディレクトリ作成
mkdir -p /var/log/pm2

# アプリ起動
cd "$STAGING_DIR"
pm2 start npm --name "dental-staging" -- start -- -p 3001
pm2 save

log_info "アプリを起動しました"

# ステップ 11: ヘルスチェック
echo ""
log_info "ステップ 11: ヘルスチェック"
echo "----------------------------------------"

sleep 5
if curl -sf http://localhost:3001/api/health > /dev/null; then
    log_info "ヘルスチェック成功!"
else
    log_warn "ヘルスチェックに失敗しました。ログを確認してください。"
    pm2 logs dental-staging --lines 50
fi

# 完了
echo ""
echo "=========================================="
echo -e "${GREEN}セットアップ完了!${NC}"
echo "=========================================="
echo ""
echo "ステージング環境URL: https://$STAGING_DOMAIN"
echo ""
echo "次のステップ:"
echo "  1. Pay.jpのテストキーを設定: nano $STAGING_DIR/.env"
echo "  2. 設定変更後、再起動: pm2 restart dental-staging"
echo "  3. ブラウザでアクセスして動作確認"
echo ""
echo "便利なコマンド:"
echo "  pm2 status              # プロセス状態確認"
echo "  pm2 logs dental-staging # ログ確認"
echo "  pm2 restart dental-staging # 再起動"
echo ""
