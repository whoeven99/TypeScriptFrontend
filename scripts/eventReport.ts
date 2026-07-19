import { useFetcher } from "@remix-run/react";
import { useCallback, useRef } from "react";

interface ReportData {
  [key: string]: any;
}

interface ReportOptions {
  action?: string; // 上报的 Remix action 路径
  method?: "post" | "get"; // 请求方法
  eventType?: "click" | "exposure"; // 事件类型
}

const useReport = () => {
  const fetcher = useFetcher();
  // 用 ref 持有最新的 fetcher，保证 report 引用稳定（[] 依赖）。
  // 否则 report 每次渲染都是新函数，一旦被放进某个 useEffect 依赖里
  // （如曝光上报），配合 fetcher.submit 触发的 loader revalidate，
  // 会形成「渲染→上报→revalidate→渲染」的死循环，最终把浏览器内存打爆。
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // 通用上报函数（引用稳定）
  const report = useCallback(
    async (data: ReportData, options: ReportOptions = {}, name: string) => {
      const {
        action = "/app", // 默认 action 路径
        method = "post",
        eventType = "click",
      } = options;
      try {
        const reportData = {
          data,
          eventType,
          timestamp: new Date().toISOString(),
          name,
        };
        fetcherRef.current.submit(
          { googleAnalytics: JSON.stringify(reportData) },
          {
            method,
            action,
          },
        );
      } catch (error) {
        console.error(`Failed to report ${eventType}:`, error);
      }
    },
    [],
  );

  // 曝光检测
  const trackExposure = useCallback(
    (
      target: Element,
      data: ReportData,
      options: ReportOptions = {},
      name: string,
    ) => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              report({ ...data }, { ...options, eventType: "exposure" }, name);
              observer.unobserve(entry.target); // 仅上报一次
            }
          });
        },
        { threshold: 0.5 }, // 50% 可见时触发
      );

      observer.observe(target); // 必须调用这一句

      return () => observer.disconnect(); // 清理函数
    },
    [report],
  );
  const reportClick = useCallback(
    (name: string) => {
      report({}, { method: "post", action: "/app", eventType: "click" }, name);
    },
    [report],
  );
  return { reportClick, report, trackExposure, fetcherState: fetcher.state };
};

export default useReport;
