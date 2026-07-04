export const globalStore: {
  shop?: string;
  server?: string;
  source?: string;
  /** TSF 本地计费用户：客户端不应再调 Java SERVER_URL。 */
  tsfBilling?: boolean;
  /** 单字段翻译走 TSF /api/translate-v4/single（全量 v4 恒为 true）。 */
  translateV4ExpressBeta?: boolean;
} = {};
