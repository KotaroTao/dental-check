#!/bin/bash
# =============================================================================
# QRくるくる診断DX - 総合バックアップスクリプト
#
# 毎日午前3時にcronで実行される
# バックアップ内容: DB / アップロード画像 / .env / Git情報 / サーバー設定
#
# crontab設定例:
#   0 3 * * * /var/www/dental-check/scripts/backup-db.sh
#
# 注意: PGPASSWORD は環境変数またはスクリプト先頭で設定してください
# =============================================================================

BACKUP_DIR=~/backups
KEEP_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)
TARGET=$BACKUP_DIR/$DATE
LOG=$BACKUP_DIR/backup.log
mkdir -p $TARGET

# ---------- 1. データベースバックアップ ----------
pg_dump -h localhost -U dental_user -d dental_check -F c -Z 9 -f $TARGET/database.dump 2>> $LOG
if [ $? -ne 0 ]; then
  echo "[$DATE] ERROR: Database dump failed" >> $LOG
  exit 1
fi
DUMP_SIZE=$(stat -c%s "$TARGET/database.dump" 2>/dev/null || echo 0)
if [ "$DUMP_SIZE" -lt 1024 ]; then
  echo "[$DATE] ERROR: Database dump too small" >> $LOG
  exit 1
fi

# ---------- 2. アップロード画像バックアップ ----------
if [ -d /var/www/dental-check/public/uploads ]; then
  tar czf $TARGET/uploads.tar.gz -C /var/www/dental-check/public uploads 2>/dev/null
fi

# ---------- 3. 設定ファイル・Git情報バックアップ ----------
cp /var/www/dental-check/.env $TARGET/env_backup 2>/dev/null

cd /var/www/dental-check
git log --oneline -1 > $TARGET/git_commit.txt
git diff > $TARGET/local_changes.patch 2>/dev/null

mkdir -p $TARGET/server_config
cp /etc/nginx/sites-available/dental-check $TARGET/server_config/ 2>/dev/null
cp /etc/nginx/sites-enabled/dental-check $TARGET/server_config/ 2>/dev/null
pm2 save 2>/dev/null && cp ~/.pm2/dump.pm2 $TARGET/server_config/ 2>/dev/null
cp ~/backup_dental.sh $TARGET/server_config/ 2>/dev/null

# ---------- 4. サイズ計測（★フォルダ削除の前に実行する） ----------
UPLOAD_SIZE=$(stat -c%s "$TARGET/uploads.tar.gz" 2>/dev/null || echo 0)

# ---------- 5. 圧縮・クリーンアップ ----------
cd $BACKUP_DIR
tar czf ${DATE}.tar.gz $DATE && rm -rf $DATE
find $BACKUP_DIR -maxdepth 1 -name "*.tar.gz" -mtime +$KEEP_DAYS -delete

# ---------- 6. ディスク容量チェック ----------
AVAIL=$(df /root --output=avail -B1 | tail -1)
if [ "$AVAIL" -lt 2147483648 ]; then
  echo "[$DATE] WARNING: Disk space low" >> $LOG
fi

# ---------- 7. ログ出力 ----------
echo "[$DATE] OK: Backup completed (DB: $(numfmt --to=iec $DUMP_SIZE), Uploads: $(numfmt --to=iec $UPLOAD_SIZE))" >> $LOG
