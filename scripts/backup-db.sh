#!/bin/bash
# =============================================================================
# QRくるくる診断DX - 自動バックアップスクリプト
#
# 毎日午前3時にcronで実行される
# - PostgreSQLデータベースのダンプ
# - アップロード画像ファイルのバックアップ
# - 30日より古いバックアップの自動削除
#
# crontab設定例:
#   0 3 * * * /var/www/dental-check/scripts/backup-db.sh
# =============================================================================

set -euo pipefail

# ---------- 設定 ----------
APP_DIR="/var/www/dental-check"
BACKUP_DIR="/var/backups/dental-check"
LOG_FILE="/var/log/dental-backup.log"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ---------- バックアップ先ディレクトリ作成 ----------
mkdir -p "$BACKUP_DIR"

# ---------- ログ出力関数 ----------
log() {
    echo "[${TIMESTAMP}] $1" >> "$LOG_FILE"
}

# ---------- 1. データベースバックアップ ----------
DB_FILE="${BACKUP_DIR}/dental_${TIMESTAMP}.sql.gz"

if sudo -u postgres pg_dump dental_check | gzip > "$DB_FILE" 2>/dev/null; then
    DB_SIZE=$(du -h "$DB_FILE" | cut -f1)
else
    log "ERROR: Database backup failed"
    exit 1
fi

# ---------- 2. アップロード画像バックアップ ----------
UPLOADS_DIR="${APP_DIR}/public/uploads"
UPLOADS_FILE="${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz"

if [ -d "$UPLOADS_DIR" ]; then
    # uploadsディレクトリをtar.gzに圧縮
    tar -czf "$UPLOADS_FILE" -C "${APP_DIR}/public" uploads/ 2>/dev/null

    # ★修正ポイント★
    # 以前のスクリプトでは、圧縮ファイルではなくディレクトリ自体のサイズを
    # 取得しようとして失敗していた（変数名の不一致や、duの対象ミス）
    # 正しくは: 作成した tar.gz ファイルのサイズを取得する
    UPLOADS_SIZE=$(du -h "$UPLOADS_FILE" | cut -f1)
else
    UPLOADS_SIZE="0"
fi

# ---------- 3. 古いバックアップを削除（30日以上前） ----------
find "$BACKUP_DIR" -name "dental_*.sql.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

# ---------- 4. ログ出力 ----------
log "OK: Backup completed (DB: ${DB_SIZE}, Uploads: ${UPLOADS_SIZE})"
