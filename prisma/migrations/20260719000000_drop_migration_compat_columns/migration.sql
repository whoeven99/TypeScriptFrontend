DROP INDEX IF EXISTS "ShopTranslationSettings_autoTranslate_migratedToTsf_idx";
DROP INDEX IF EXISTS "ShopBillingBinding_billingSystem_idx";

ALTER TABLE "ShopTranslationSettings" DROP COLUMN "migratedToTsf";
ALTER TABLE "ShopTranslationSettings" DROP COLUMN "migratedAt";
ALTER TABLE "ShopTargetLocale" DROP COLUMN "status";
ALTER TABLE "ShopBillingBinding" DROP COLUMN "billingSystem";
ALTER TABLE "ShopBillingBinding" DROP COLUMN "boundReason";
