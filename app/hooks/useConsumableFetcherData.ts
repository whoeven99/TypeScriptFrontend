import { useCallback, useRef } from "react";

export function useConsumableFetcherData<T = unknown>() {
  const handledRef = useRef<T | null>(null);

  const consume = useCallback((data: T | null | undefined) => {
    if (!data || handledRef.current === data) {
      return null;
    }
    handledRef.current = data;
    return data;
  }, []);

  const reset = useCallback(() => {
    handledRef.current = null;
  }, []);

  return {
    consume,
    reset,
  };
}
