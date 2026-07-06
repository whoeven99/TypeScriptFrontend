export const SUPPORT_CHAT_OPEN_EVENT = "ciwi:support-chat-open";

declare global {
  interface Window {
    ciwiSupportChat?: {
      open: () => void;
    };
  }
}

/** 打开全局 TSF 客服浮层（各页「联系客服」按钮统一入口）。 */
export function openSupportChat() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SUPPORT_CHAT_OPEN_EVENT));
}

export function handleContactSupport() {
  openSupportChat();
}
