-- Default on: new rows and existing shops enable storefront auto liquid collect.
-- Merchant UI toggle removed; ops kill-switch remains AUTO_LIQUID_COLLECT_ENABLED.
ALTER TABLE "SwitcherConfiguration"
  ALTER COLUMN "autoLiquidCollect" SET DEFAULT true;

UPDATE "SwitcherConfiguration"
SET "autoLiquidCollect" = true
WHERE "autoLiquidCollect" = false;
