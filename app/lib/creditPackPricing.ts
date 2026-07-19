/**
 * 加量包标价表（与定价页一致）。
 * optionName 形如 "500K" / "1M"；订阅档决定折扣价。
 */
export const CREDIT_PACK_PRICE_TABLE: Record<
  string,
  { base: number; Premium: number; Pro: number; Basic: number }
> = {
  "500K": { base: 3.99, Premium: 1.99, Pro: 2.99, Basic: 3.59 },
  "1M": { base: 7.99, Premium: 3.99, Pro: 5.99, Basic: 7.19 },
  "2M": { base: 15.99, Premium: 7.99, Pro: 11.99, Basic: 14.39 },
  "3M": { base: 23.99, Premium: 11.99, Pro: 17.99, Basic: 21.79 },
  "5M": { base: 39.99, Premium: 19.99, Pro: 29.99, Basic: 35.99 },
  "10M": { base: 79.99, Premium: 39.99, Pro: 59.99, Basic: 71.99 },
  "20M": { base: 159.99, Premium: 79.99, Pro: 119.99, Basic: 143.99 },
  "30M": { base: 239.99, Premium: 119.99, Pro: 179.99, Basic: 215.99 },
};

export type CreditPackPrice = {
  currentPrice: number;
  comparedPrice: number;
  currencyCode: string;
};

/** 根据计划类型返回加量包价格（与定价页 eNumPlanType 相同）。 */
export function eNumPlanType(args: {
  planType: string;
  optionName: string;
  isInTrial: boolean;
}): CreditPackPrice {
  const findTableData = CREDIT_PACK_PRICE_TABLE[args.optionName];

  if (!findTableData) {
    return {
      currentPrice: 239.99,
      comparedPrice: 239.99,
      currencyCode: "USD",
    };
  }

  if (args.isInTrial) {
    return {
      currentPrice: findTableData.base,
      comparedPrice: findTableData.base,
      currencyCode: "USD",
    };
  }

  const map: Record<string, number> = {
    Premium: findTableData.Premium,
    Pro: findTableData.Pro,
    Basic: findTableData.Basic,
  };

  const currentPrice = map[args.planType ?? ""] ?? findTableData.base;

  return {
    currentPrice,
    comparedPrice: findTableData.base,
    currencyCode: "USD",
  };
}
