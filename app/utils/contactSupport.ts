export function handleContactSupport() {
  interface WindowWithTidio extends Window {
    tidioChatApi?: {
      open: () => void;
    };
  }

  if ((window as WindowWithTidio)?.tidioChatApi) {
    (window as WindowWithTidio).tidioChatApi?.open();
  } else {
    console.warn("Tidio Chat API not loaded");
  }
}
