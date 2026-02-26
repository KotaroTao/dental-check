-- AlterTable
ALTER TABLE "channels" ADD COLUMN "display_name" TEXT;
ALTER TABLE "channels" ADD COLUMN "distribution_period" TEXT;
ALTER TABLE "channels" ADD COLUMN "documents" JSONB NOT NULL DEFAULT '[]';
