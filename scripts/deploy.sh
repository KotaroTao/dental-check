#!/bin/bash
# DentalCheck 本番環境デプロイスクリプト

set -e

echo "=========================================="
echo "DentalCheck Production Deployment"
echo "=========================================="

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 環境変数チェック
check_env() {
    echo -e "${YELLOW}[1/6] 環境変数をチェック中...${NC}"

    if [ ! -f .env.production ]; then
        echo -e "${RED}エラー: .env.production ファイルが見つかりません${NC}"
        echo "cp .env.production.example .env.production を実行し、環境変数を設定してください"
        exit 1
    fi

    source .env.production

    required_vars=(
        "POSTGRES_PASSWORD"
        "PAYJP_SECRET_KEY"
        "PAYJP_WEBHOOK_SECRET"
        "NEXT_PUBLIC_PAYJP_PUBLIC_KEY"
        "JWT_SECRET"
        "NEXT_PUBLIC_APP_URL"
    )

    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo -e "${RED}エラー: 環境変数 $var が設定されていません${NC}"
            exit 1
        fi
    done

    echo -e "${GREEN}環境変数チェック完了${NC}"
}

# SSL証明書チェック
check_ssl() {
    echo -e "${YELLOW}[2/6] SSL証明書をチェック中...${NC}"

    if [ ! -f nginx/ssl/fullchain.pem ] || [ ! -f nginx/ssl/privkey.pem ]; then
        echo -e "${YELLOW}警告: SSL証明書が見つかりません${NC}"
        echo "Let's Encryptで証明書を取得するか、自己署名証明書を生成してください"

        read -p "自己署名証明書を生成しますか? (開発/テスト用) [y/N]: " response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            echo "自己署名証明書を生成中..."
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout nginx/ssl/privkey.pem \
                -out nginx/ssl/fullchain.pem \
                -subj "/CN=localhost"
            echo -e "${GREEN}自己署名証明書を生成しました${NC}"
        else
            echo -e "${RED}SSL証明書なしでは続行できません${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}SSL証明書が存在します${NC}"
    fi
}

# Dockerイメージビルド
build_image() {
    echo -e "${YELLOW}[3/6] Dockerイメージをビルド中...${NC}"
    docker build -f Dockerfile.production -t dental-check:latest .
    echo -e "${GREEN}イメージビルド完了${NC}"
}

# 既存コンテナ停止
stop_containers() {
    echo -e "${YELLOW}[4/6] 既存コンテナを停止中...${NC}"
    docker-compose -f docker-compose.production.yml --env-file .env.production down || true
    echo -e "${GREEN}コンテナ停止完了${NC}"
}

# データベースマイグレーション
run_migration() {
    echo -e "${YELLOW}[5/6] データベースマイグレーションを実行中...${NC}"

    # データベースコンテナを先に起動
    docker-compose -f docker-compose.production.yml --env-file .env.production up -d db

    # データベースが起動するまで待機
    echo "データベースの起動を待機中..."
    sleep 10

    # マイグレーション実行
    docker-compose -f docker-compose.production.yml --env-file .env.production run --rm app \
        npx prisma migrate deploy

    echo -e "${GREEN}マイグレーション完了${NC}"
}

# コンテナ起動
start_containers() {
    echo -e "${YELLOW}[6/6] コンテナを起動中...${NC}"
    docker-compose -f docker-compose.production.yml --env-file .env.production up -d
    echo -e "${GREEN}コンテナ起動完了${NC}"
}

# ヘルスチェック
health_check() {
    echo -e "${YELLOW}ヘルスチェック中...${NC}"

    max_attempts=30
    attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
            echo -e "${GREEN}アプリケーションが正常に起動しました${NC}"
            return 0
        fi

        echo "待機中... ($attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done

    echo -e "${RED}ヘルスチェック失敗${NC}"
    docker-compose -f docker-compose.production.yml logs app
    exit 1
}

# メイン処理
main() {
    cd "$(dirname "$0")/.."

    check_env
    check_ssl
    build_image
    stop_containers
    run_migration
    start_containers
    health_check

    echo ""
    echo "=========================================="
    echo -e "${GREEN}デプロイ完了!${NC}"
    echo "=========================================="
    echo ""
    echo "アプリケーションURL: ${NEXT_PUBLIC_APP_URL}"
    echo ""
    echo "ログ確認: docker-compose -f docker-compose.production.yml logs -f"
    echo "停止:     docker-compose -f docker-compose.production.yml down"
    echo ""
}

main "$@"
