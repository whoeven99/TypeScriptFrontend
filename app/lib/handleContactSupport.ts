/** 打开 Tidio 客服聊天（paymentModal 等复用）。 */
export function handleContactSupport(): void {
  interface WindowWithTidio extends Window {
    tidioChatApi?: { open: () => void };
  }

  const win = window as WindowWithTidio;
  if (win.tidioChatApi) {
    win.tidioChatApi.open();
  } else {
    console.warn("Tidio Chat API not loaded");
  }
}
