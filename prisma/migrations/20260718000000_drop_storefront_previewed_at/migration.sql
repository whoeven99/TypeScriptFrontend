-- Drop storefront preview persistence (client localStorage only).
ALTER TABLE ShopTargetLocale DROP COLUMN storefrontPreviewedAt;
