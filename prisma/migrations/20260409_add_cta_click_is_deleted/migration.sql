-- AlterTable: CTAClickにisDeletedフィールドを追加
ALTER TABLE "cta_clicks" ADD COLUMN "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex: sessionIdにインデックスを追加（パフォーマンス改善）
CREATE INDEX "cta_clicks_session_id_idx" ON "cta_clicks"("session_id");
