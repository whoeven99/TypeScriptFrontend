/**
 * antd `message` 的 drop-in 替代 —— 内部走 Shopify App Bridge toast。
 *
 * 迁移用法：把 `import { message } from "antd"` 改成 `import { message } from "~/ui/message"`，
 * 调用点（message.success/error/warning/info/loading/open）保持不变。
 *
 * 设计说明：
 * - 本 app 是嵌入式 Shopify 应用，App Bridge 注入了全局 `shopify`，原生 toast 即 `shopify.toast.show`。
 *   因此无需 Polaris `<Frame>`，零布局风险。
 * - App Bridge toast 只有「普通 / 错误(isError)」两态：success/info/warning/loading 统一普通态，error 用 isError。
 * - duration 对齐 antd 语义（秒）；App Bridge 用毫秒，内部换算。未传默认 3s。
 * - SSR 或 App Bridge 未就绪时降级为 console，不抛错。
 */

type ToastShowOptions = { duration?: number; isError?: boolean };
type ToastApi = {
  show: (message: string, options?: ToastShowOptions) => unknown;
  hide?: (id: unknown) => void;
};

type ToastPatchState = {
  originalShow: ToastApi["show"];
};

const toastPatchStateMap = new WeakMap<object, ToastPatchState>();

function getToast(): ToastApi | null {
  const s = (globalThis as { shopify?: { toast?: ToastApi } }).shopify;
  return s?.toast ?? null;
}

export function patchToastDeduplication(dedupeWindowMs = 1200): () => void {
  const toast = getToast();
  if (!toast?.show) return () => {};

  const toastObject = toast as object;
  const currentState = toastPatchStateMap.get(toastObject);
  if (currentState) {
    return () => {};
  }

  const originalShow = toast.show.bind(toast);
  const recentToastMap = new Map<string, number>();

  toast.show = ((content: string, options?: ToastShowOptions) => {
    const text =
      typeof content === "string" ? content.trim() : String(content ?? "").trim();
    const now = Date.now();

    for (const [key, timestamp] of recentToastMap) {
      if (now - timestamp > Math.max(dedupeWindowMs * 4, 8000)) {
        recentToastMap.delete(key);
      }
    }

    if (text) {
      const dedupeKey = `${options?.isError ? "error" : "normal"}:${text}`;
      const lastShownAt = recentToastMap.get(dedupeKey);
      if (typeof lastShownAt === "number" && now - lastShownAt < dedupeWindowMs) {
        return undefined;
      }
      recentToastMap.set(dedupeKey, now);
    }

    return originalShow(content, options);
  }) as ToastApi["show"];

  toastPatchStateMap.set(toastObject, { originalShow });

  return () => {
    const state = toastPatchStateMap.get(toastObject);
    if (!state) return;
    toast.show = state.originalShow;
    toastPatchStateMap.delete(toastObject);
  };
}

/** antd 用秒，App Bridge 用毫秒；未传用 3s。 */
function toMs(duration?: number): number {
  if (typeof duration === "number" && duration > 0) return Math.round(duration * 1000);
  return 3000;
}

/** 返回一个关闭函数，兼容 antd `const hide = message.loading(...)` 的用法。 */
function show(content: unknown, duration?: number, isError = false): () => void {
  const text = typeof content === "string" ? content : String(content ?? "");
  const api = getToast();
  if (!api) {
    (isError ? console.error : console.log)("[toast]", text);
    return () => {};
  }
  const id = api.show(text, { duration: toMs(duration), isError });
  return () => {
    try {
      api.hide?.(id);
    } catch {
      // ignore
    }
  };
}

export type MessageContent = unknown;

export const message = {
  success: (content: MessageContent, duration?: number) => show(content, duration, false),
  error: (content: MessageContent, duration?: number) => show(content, duration, true),
  warning: (content: MessageContent, duration?: number) => show(content, duration, false),
  info: (content: MessageContent, duration?: number) => show(content, duration, false),
  loading: (content: MessageContent, duration?: number) => show(content, duration, false),
  open: (config: { content?: MessageContent; duration?: number; type?: string }) =>
    show(config?.content, config?.duration, config?.type === "error"),
};

export default message;
