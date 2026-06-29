import { useEffect, useRef, useState } from "react";

/**
 * 数字从 0 平滑滚动到目标值（缓出曲线）。
 * - 初始 state 即为目标值，保证 SSR 与首帧一致，避免 hydration mismatch。
 * - 挂载后（以及每次 target 变化，例如刷新统计）从 0 重新滚动到新值。
 */
export function useCountUp(target: number, durationMs = 1000): number {
  const [value, setValue] = useState(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const safeTarget = Number.isFinite(target) ? target : 0;
    const start = performance.now();
    const animate = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(safeTarget * eased));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setValue(safeTarget);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);

  return value;
}
