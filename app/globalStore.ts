export const globalStore: {
  shop?: string;
  server?: string;
  source?: string;
  /** 单字段翻译走 TSF /api/translate-v4/single（全量 v4 恒为 true）。 */
  translateV4ExpressBeta?: boolean;
  /**
   * 页面级「翻译提示词」：用户在翻译管理页输入、描述本次翻译方向/风格。
   * 手动单条翻译时随 /api/translate-v4/single 一起上送并注入 system prompt。
   * 仅当前会话内保留（不持久化）。
   */
  translatePrompt?: string;
} = {};
