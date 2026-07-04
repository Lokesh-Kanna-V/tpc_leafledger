-- AlterTable
ALTER TABLE "offices" ADD COLUMN "leaf_alert_days" INTEGER NOT NULL DEFAULT 2;

-- DropColumn
ALTER TABLE "offices" DROP COLUMN "is_pickup_center";
