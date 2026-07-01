declare global {
  interface Window {
    tidioChatApi?: {
      open: () => void;
    };
  }
}

export function handleContactSupport() {
  const chatApi = window.tidioChatApi;

  if (chatApi) {
    chatApi.open();
  } else {
    console.warn("Tidio Chat API not loaded");
  }
}
