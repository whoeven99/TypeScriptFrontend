export const globalStore: {
  shop?: string;
  server?: string;
  source?: string;
  /** 本店是否在 translate-v4 灰度白名单内（决定单字段翻译走 TSF 还是 Java 直连）。 */
  translateV4ExpressBeta?: boolean;
} = {};
