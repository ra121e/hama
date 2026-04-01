"use client";

import { useEffect, useMemo, useRef } from "react";
import type { EChartsOption } from "echarts";
import * as echarts from "echarts/core";
import { RadarChart as RadarChartRenderer } from "echarts/charts";
import { LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { cn } from "@/lib/utils";

echarts.use([RadarChartRenderer, TooltipComponent, LegendComponent, CanvasRenderer]);

const INDICATORS = [
  { name: "時間バランス", max: 100 },
  { name: "健康", max: 100 },
  { name: "人間関係", max: 100 },
  { name: "自己実現", max: 100 },
];

const SERIES_COLORS = ["#0f766e", "#1d4ed8", "#d97706", "#be123c", "#4f46e5"];

export type RadarSeriesData = {
  name: string;
  values: [number, number, number, number];
};

type RadarChartProps = {
  series: RadarSeriesData[];
  className?: string;
};

export function RadarChart({ series, className }: RadarChartProps) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  const option = useMemo<EChartsOption>(() => {
    return {
      color: SERIES_COLORS,
      tooltip: {
        trigger: "item",
      },
      legend: {
        top: 8,
        textStyle: {
          color: "#52525b",
        },
      },
      radar: {
        center: ["50%", "56%"],
        radius: "62%",
        splitNumber: 5,
        indicator: INDICATORS,
        axisName: {
          color: "#3f3f46",
          fontSize: 12,
        },
        splitArea: {
          areaStyle: {
            color: ["rgba(244, 244, 245, 0.65)", "rgba(228, 228, 231, 0.4)"],
          },
        },
        splitLine: {
          lineStyle: {
            color: "rgba(161, 161, 170, 0.45)",
          },
        },
        axisLine: {
          lineStyle: {
            color: "rgba(161, 161, 170, 0.6)",
          },
        },
      },
      series: [
        {
          name: "ハッピースコア",
          type: "radar",
          data: series.map((item, index) => ({
            name: item.name,
            value: item.values,
            lineStyle: {
              width: 2,
              color: SERIES_COLORS[index % SERIES_COLORS.length],
            },
            areaStyle: {
              color: SERIES_COLORS[index % SERIES_COLORS.length],
              opacity: 0.18,
            },
            symbolSize: 6,
          })),
        },
      ],
    };
  }, [series]);

  useEffect(() => {
    if (!chartContainerRef.current) {
      return;
    }

    chartInstanceRef.current = echarts.init(chartContainerRef.current);
    chartInstanceRef.current.setOption(option);

    const resizeObserver = new ResizeObserver(() => {
      chartInstanceRef.current?.resize();
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };
  }, [option]);

  return (
    <div
      ref={chartContainerRef}
      className={cn("h-[360px] w-full rounded-xl", className)}
      aria-label="ハッピー4項目のレーダーチャート"
    />
  );
}
