import React, { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface Props {
  data: any[];
  height?: number;
}

const LineChartECharts: React.FC<Props> = ({ data, height = 300 }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      chartInstance.current = echarts.init(chartRef.current);

      // 使用 ResizeObserver 监听父容器尺寸变化
      const resizeObserver = new ResizeObserver(() => {
        chartInstance.current?.resize();
      });
      resizeObserver.observe(chartRef.current);

      return () => {
        resizeObserver.disconnect();
        chartInstance.current?.dispose();
      };
    }
  }, []);
  const formatPercent = (val: number) => {
    if (val == null) return "-";
    // 判断是不是整数
    return Number.isInteger(val) ? `${val}%` : `${val.toFixed(2)}%`;
  };
  useEffect(() => {
    if (!chartInstance.current) return;
    // 收集所有值，处理空数据的情况
    const allValues = data.flatMap((series) =>
      (series.data || []).map((d: any) => Number(d.value) || 0),
    );
    const maxValue = allValues.length ? Math.max(...allValues) : 0;

    // 动态计算纵轴最大值（留 20% 空白），但不超过 100
    // 并且保证至少有一个合理的最小值（避免全 0 时图线贴底）
    const padded = Math.ceil(maxValue * 1.2);
    const dynamicMaxRaw = Math.max(padded, maxValue === 0 ? 10 : padded);
    const dynamicMax = Math.min(dynamicMaxRaw, 100);

    // helper：把间隔(roundInterval)变成 "漂亮" 的数字（1,2,5,10,20,50...）
    const niceInterval = (target: number) => {
      if (target <= 1) return 1;
      // 基于 target 找出 1,2,5 * 10^n 中 >= target 的最小值
      const bases = [1, 2, 5];
      const exp = Math.floor(Math.log10(target));
      const pow = Math.pow(10, exp);
      for (let i = 0; i < bases.length; i++) {
        const cand = bases[i] * pow;
        if (cand >= target) return cand;
      }
      // 如果都不够，返回下一级的 1 * 10^(exp+1)
      return 1 * Math.pow(10, exp + 1);
    };

    // 目标刻度数（你想要的分割数量），可调，4~6 都不错
    const desiredTicks = 6;
    // 基本 interval 估算
    const roughInterval = Math.max(1, Math.ceil(dynamicMax / desiredTicks));
    // 使用 niceInterval 让刻度更整齐
    const interval = niceInterval(roughInterval);

    const option = {
      grid: {
        top: 20,
        right: 0,
        bottom: 0,
        left: 0,
        containLabel: true, // 如果你要完整显示坐标轴文字就留 true，不要的话可以设 false
      },
      xAxis: {
        type: "category",
        data: data[0].data.map((d: any) => d.key),
      },
      yAxis: {
        type: "value",
        max: dynamicMax, // ✅ 动态设置最大值
        axisLabel: { formatter: "{value}%" },
        // splitNumber: 2, // 控制纵轴分割线数量，数字越小越稀疏
        interval,
        // 或者使用 interval 精确控制间隔
        // interval: 20,  // 每 20% 一个横线
      },
      series: data.map((series: any) => ({
        data: series.data.map((d: any) => d.value),
        type: "line",
        name: series.name,
        smooth: true,
        symbol: "none", // 去掉圆圈
      })),
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          let result = params[0].axisValue + "<br/>";
          params.forEach((item: any) => {
            result += `${item.marker}${item.seriesName}: ${formatPercent(item.value)}<br/>`;
          });
          return result;
        },
      },
    };

    chartInstance.current.setOption(option);
    chartInstance.current.resize();
  }, [data]);

  return <div ref={chartRef} style={{ width: "100%", height }} />;
};

export default LineChartECharts;
