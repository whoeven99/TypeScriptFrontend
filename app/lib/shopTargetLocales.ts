export type ShopLocaleLike = {
  value: string;
  label: string;
  primary?: boolean;
};

/** 与语言页一致：店铺内所有非主语言（含未发布、未翻译、未开自动翻译）。 */
export function selectShopTargetLocales<T extends ShopLocaleLike>(
  locales: T[],
  sourceLocale: string,
): T[] {
  const source = sourceLocale.trim();
  return locales.filter((l) => !l.primary && l.value !== source);
}
