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

export type HappinessRadarValues = {
  hap_time: number;
  hap_health: number;
  hap_relation: number;
  hap_selfreal: number;
};

export type RadarSeriesData = {
  name: string;
  values: [number, number, number, number];
};

type RadarChartProps = {
  happiness: HappinessRadarValues;
  scenarioName?: string;
  comparisonSeries?: RadarSeriesData[];
  className?: string;
};

export function RadarChart({
  happiness,
  scenarioName = "現在入力",
  comparisonSeries = [],
  className,
}: RadarChartProps) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  const series = useMemo<RadarSeriesData[]>(
    () => [
      {
        name: scenarioName,
        values: [
          happiness.hap_time,
          happiness.hap_health,
          happiness.hap_relation,
          happiness.hap_selfreal,
        ],
      },
      ...comparisonSeries,
    ],
    [
      comparisonSeries,
      happiness.hap_health,
      happiness.hap_relation,
      happiness.hap_selfreal,
      happiness.hap_time,
      scenarioName,
    ],
  );

  const option = useMemo<EChartsOption>(() => {
    return {
      animationDurationUpdate: 280,
      animationEasingUpdate: "cubicOut",
      color: SERIES_COLORS,
      tooltip: {
        trigger: "item",
        formatter(params) {
          const point = params as { name?: string; value?: number[] };
          if (!point.value) {
            return "データなし";
          }

          return [
            `<strong>${point.name ?? "シナリオ"}</strong>`,
            `時間バランス: ${point.value[0] ?? 0}`,
            `健康: ${point.value[1] ?? 0}`,
            `人間関係: ${point.value[2] ?? 0}`,
            `自己実現: ${point.value[3] ?? 0}`,
          ].join("<br/>");
        },
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
          name: "ハッピー4軸",
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
            emphasis: {
              lineStyle: {
                width: 3,
              },
              areaStyle: {
                opacity: 0.28,
              },
            },
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

    const resizeObserver = new ResizeObserver(() => {
      chartInstanceRef.current?.resize();
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartInstanceRef.current?.setOption(option, {
      notMerge: false,
      lazyUpdate: true,
    });
  }, [option]);

  return (
    <div
      ref={chartContainerRef}
      className={cn("h-[360px] w-full rounded-xl", className)}
      aria-label="ハッピー4項目のレーダーチャート"
    />
  );
}
