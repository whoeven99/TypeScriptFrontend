import React, { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface LineChartEChartsProps {
  data: any[];
  height?: number;
}

export default function LineChartECharts({ data, height = 300 }: LineChartEChartsProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    return () => {
      chartInstance.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!chartInstance.current) return;

    const option = {
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          return params
            .map(
              (p: any) =>
                `${p.seriesName}: ${Number(p.data[1]).toFixed(1)}%`
            )
            .join("<br/>");
        },
      },
      xAxis: {
        type: "category",
        data: data[0]?.data.map((d: any) => d.key),
      },
      yAxis: {
        type: "value",
        axisLabel: {
          formatter: "{value}%",
        },
        min: 0,
      },
      series: data.map((series: any) => ({
        name: series.name,
        type: "line",
        data: series.data.map((d: any) => [d.key, d.value]),
        smooth: true,
      })),
      grid: {
        left: "10%",
        right: "10%",
        top: "20%",
        bottom: "15%",
      },
    };

    chartInstance.current.setOption(option);
  }, [data]);

  return <div ref={chartRef} style={{ width: "100%", height }} />;
}
