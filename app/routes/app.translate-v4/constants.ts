export const MODULE_LABELS: Record<string, string> = {
  PRODUCT: "商品",
  PRODUCT_OPTION: "商品选项",
  PRODUCT_OPTION_VALUE: "商品选项值",
  COLLECTION: "商品系列",
  ONLINE_STORE_THEME_APP_EMBED: "主题 App 嵌入",
  ONLINE_STORE_THEME_JSON_TEMPLATE: "主题模板",
  ONLINE_STORE_THEME_SECTION_GROUP: "主题区块组",
  ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS: "主题设置",
  MENU: "导航菜单",
  LINK: "链接",
  DELIVERY_METHOD_DEFINITION: "配送方式",
  FILTER: "筛选器",
  METAFIELD: "元字段",
  METAOBJECT: "元对象",
  PAYMENT_GATEWAY: "支付网关",
  SELLING_PLAN: "销售计划",
  SELLING_PLAN_GROUP: "销售计划组",
  SHOP: "店铺信息",
  ARTICLE: "博客文章",
  BLOG: "博客",
  PAGE: "页面",
};

export const DEFAULT_MODULES = ["PRODUCT", "COLLECTION", "PAGE", "ARTICLE"];

export const QUOTA_TOKEN_MULTIPLIER = 1.5;

export const AI_MODEL_OPTIONS = [
  { value: "deepseek-v4-flash", label: "deepseek-v4-flash" },
  { value: "deepseek-v4-pro", label: "deepseek-v4-pro" },
];

/** 创建任务卡片上展示的模块（与设计稿一致 + 其余可切换）。 */
export const CREATE_TASK_MODULE_OPTIONS = [
  "PRODUCT",
  "COLLECTION",
  "PAGE",
  "ARTICLE",
  "MENU",
  "ONLINE_STORE_THEME_JSON_TEMPLATE",
  "FILTER",
] as const;
