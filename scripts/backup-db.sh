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
UPLOADS_SIZE="0"

if [ -d "$UPLOADS_DIR" ]; then
    # アップロードディレクトリ内の画像ファイル数を確認
    FILE_COUNT=$(find "$UPLOADS_DIR" -type f -not -name ".gitkeep" 2>/dev/null | wc -l)

    if [ "$FILE_COUNT" -gt 0 ]; then
        # uploadsディレクトリをtar.gzに圧縮
        tar -czf "$UPLOADS_FILE" -C "${APP_DIR}/public" uploads/ 2>/dev/null

        # 作成されたtar.gzファイルのサイズを取得
        if [ -f "$UPLOADS_FILE" ]; then
            UPLOADS_SIZE=$(du -h "$UPLOADS_FILE" | cut -f1)
        fi
    fi
fi

# uploadsディレクトリ自体のサイズもフォールバックとして計算
# （tar.gzが作れなかった場合でも、元ディレクトリのサイズを表示）
if [ "$UPLOADS_SIZE" = "0" ] && [ -d "$UPLOADS_DIR" ]; then
    SRC_SIZE=$(du -sh "$UPLOADS_DIR" 2>/dev/null | cut -f1)
    if [ -n "$SRC_SIZE" ] && [ "$SRC_SIZE" != "0" ] && [ "$SRC_SIZE" != "4.0K" ]; then
        UPLOADS_SIZE="${SRC_SIZE}(src)"
    fi
fi

# ---------- 3. 古いバックアップを削除（30日以上前） ----------
find "$BACKUP_DIR" -name "dental_*.sql.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

# ---------- 4. ログ出力 ----------
log "OK: Backup completed (DB: ${DB_SIZE}, Uploads: ${UPLOADS_SIZE})"
