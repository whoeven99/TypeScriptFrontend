import { useEffect, useState } from "react";

/** 首屏渲染后再挂载非关键 UI（客服浮层等），避免阻塞 LCP。 */
export function useIdleReady(timeout = 2500) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;

    let cancelled = false;
    const markReady = () => {
      if (!cancelled) setReady(true);
    };

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(markReady, { timeout });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }

    const id = window.setTimeout(markReady, Math.min(timeout, 1500));
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [ready, timeout]);

  return ready;
}
