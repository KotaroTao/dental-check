-- CreateTable: チラシ（1枚のチラシに複数QRを束ねる親レコード）
CREATE TABLE "flyers" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "distribution_method" TEXT,
    "distribution_quantity" INTEGER,
    "distribution_period" TEXT,
    "budget" INTEGER,
    "image_url" TEXT,
    "image_url_2" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flyers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flyers_clinic_id_idx" ON "flyers"("clinic_id");

-- AddForeignKey: 医院が削除されたら配下のチラシも削除
ALTER TABLE "flyers" ADD CONSTRAINT "flyers_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Channelに flyer_id を追加（既存QRは null = 単独QR扱い）
ALTER TABLE "channels" ADD COLUMN "flyer_id" TEXT;

-- CreateIndex: flyer_id での検索を高速化
CREATE INDEX "channels_flyer_id_idx" ON "channels"("flyer_id");

-- AddForeignKey: チラシ削除時は Channel.flyer_id を NULL に戻す（QR自体は残す）
ALTER TABLE "channels" ADD CONSTRAINT "channels_flyer_id_fkey" FOREIGN KEY ("flyer_id") REFERENCES "flyers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
