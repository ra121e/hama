"use client";

import { useEffect, useMemo, useRef } from "react";
import type { EChartsOption } from "echarts";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { calcHamaScore } from "@/shared/lib/hama-score";
import { useProfileStore } from "@/store/profileStore";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

echarts.use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

const TIMEPOINTS = [
  { key: "now", label: "現在" },
  { key: "5y", label: "5年後" },
  { key: "10y", label: "10年後" },
  { key: "20y", label: "20年後" },
] as const;

type DualAxisChartProps = {
  className?: string;
  showHappinessSeries?: boolean;
};

type PointData = {
  assets: number;
  income: number;
  expense: number;
  hap_time: number;
  hap_health: number;
  hap_relation: number;
  hap_selfreal: number;
};

const toManYen = (value: number) => value / 10000;

const createBasePoint = (profile: ReturnType<typeof useProfileStore.getState>["profile"]): PointData => ({
  assets: profile.financial.fin_assets,
  income: profile.financial.fin_income,
  expense: profile.financial.fin_expense,
  hap_time: profile.happiness.hap_time,
  hap_health: profile.happiness.hap_health,
  hap_relation: profile.happiness.hap_relation,
  hap_selfreal: profile.happiness.hap_selfreal,
});

export function DualAxisChart({ className, showHappinessSeries = true }: DualAxisChartProps) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  const profile = useProfileStore((state) => state.profile);
  const hamaScoreNow = useProfileStore((state) => state.hamaScore);
  const activeScenarioId = useProfileStore((state) => state.activeScenarioId);
  const snapshotsByScenario = useProfileStore((state) => state.snapshotsByScenario);
  const chartOpacity = useUIStore((state) => state.chartOpacity);

  const timeline = useMemo(() => {
    const scenarioSnapshots = snapshotsByScenario[activeScenarioId] ?? {};

    const points: PointData[] = [];
    let carry = createBasePoint(profile);

    for (const timepoint of TIMEPOINTS) {
      const snapshots = scenarioSnapshots[timepoint.key] ?? [];
      const next: PointData = { ...carry };

      for (const snapshot of snapshots) {
        if (snapshot.categoryId === "financial") {
          if (snapshot.itemId === "fin_assets") next.assets = snapshot.value;
          if (snapshot.itemId === "fin_income") next.income = snapshot.value;
          if (snapshot.itemId === "fin_expense") next.expense = snapshot.value;
        }

        if (snapshot.categoryId === "happiness") {
          if (snapshot.itemId === "hap_time") next.hap_time = snapshot.value;
          if (snapshot.itemId === "hap_health") next.hap_health = snapshot.value;
          if (snapshot.itemId === "hap_relation") next.hap_relation = snapshot.value;
          if (snapshot.itemId === "hap_selfreal") next.hap_selfreal = snapshot.value;
        }
      }

      points.push(next);
      carry = next;
    }

    const scoreSeries = points.map((point, index) => {
      if (index === 0) {
        return hamaScoreNow;
      }

      return calcHamaScore(
        {
          financial: {
            assets: point.assets,
            income: point.income,
            expense: point.expense,
          },
          happiness: {
            hap_time: point.hap_time,
            hap_health: point.hap_health,
            hap_relation: point.hap_relation,
            hap_selfreal: point.hap_selfreal,
          },
        },
        {
          weightHappiness: profile.settings.weightHappiness,
          weightFinance: profile.settings.weightFinance,
          targetAssets: profile.settings.targetAssets,
        },
      );
    });

    return {
      labels: TIMEPOINTS.map((item) => item.label),
      assets: points.map((point) => toManYen(point.assets)),
      income: points.map((point) => toManYen(point.income)),
      expense: points.map((point) => toManYen(point.expense)),
      hap_time: points.map((point) => point.hap_time),
      hap_health: points.map((point) => point.hap_health),
      hap_relation: points.map((point) => point.hap_relation),
      hap_selfreal: points.map((point) => point.hap_selfreal),
      hama: scoreSeries,
    };
  }, [activeScenarioId, hamaScoreNow, profile, snapshotsByScenario]);

  const option = useMemo<EChartsOption>(() => {
    return {
      color: ["#2563eb", "#0284c7", "#60a5fa", "#16a34a", "#f59e0b", "#84cc16", "#f97316", "#14b8a6"],
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "line",
        },
      },
      legend: {
        top: 8,
        selectedMode: "multiple",
        textStyle: {
          color: "#52525b",
        },
      },
      grid: {
        left: 56,
        right: 56,
        top: 56,
        bottom: 40,
      },
      xAxis: {
        type: "category",
        data: timeline.labels,
        boundaryGap: false,
        axisLine: {
          lineStyle: {
            color: "#a1a1aa",
          },
        },
      },
      yAxis: [
        {
          type: "value",
          name: "金額（万円）",
          position: "left",
          axisLabel: {
            formatter: (value: number) => `${value}`,
          },
        },
        {
          type: "value",
          name: "HAMAスコア",
          position: "right",
          min: 0,
          max: 100,
        },
      ],
      series: [
        {
          name: "総資産",
          type: "line",
          yAxisIndex: 0,
          smooth: true,
          data: timeline.assets,
          lineStyle: { width: 2, opacity: chartOpacity.financial },
          areaStyle: { opacity: 0.06 * chartOpacity.financial },
        },
        {
          name: "収入",
          type: "line",
          yAxisIndex: 0,
          smooth: true,
          data: timeline.income,
          lineStyle: { width: 2, opacity: chartOpacity.financial },
          areaStyle: { opacity: 0.06 * chartOpacity.financial },
        },
        {
          name: "支出",
          type: "line",
          yAxisIndex: 0,
          smooth: true,
          data: timeline.expense,
          lineStyle: { width: 2, opacity: chartOpacity.financial },
          areaStyle: { opacity: 0.04 * chartOpacity.financial },
        },
        {
          name: "HAMAスコア",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          symbolSize: 7,
          data: timeline.hama,
          lineStyle: { width: 3, opacity: chartOpacity.hamaScore },
        },
        {
          name: "時間バランス",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          data: showHappinessSeries ? timeline.hap_time : [],
          lineStyle: { width: 2, opacity: chartOpacity.hap_time },
          areaStyle: { opacity: 0.06 * chartOpacity.hap_time },
        },
        {
          name: "健康",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          data: showHappinessSeries ? timeline.hap_health : [],
          lineStyle: { width: 2, opacity: chartOpacity.hap_health },
          areaStyle: { opacity: 0.06 * chartOpacity.hap_health },
        },
        {
          name: "人間関係",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          data: showHappinessSeries ? timeline.hap_relation : [],
          lineStyle: { width: 2, opacity: chartOpacity.hap_relation },
          areaStyle: { opacity: 0.06 * chartOpacity.hap_relation },
        },
        {
          name: "自己実現",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          data: showHappinessSeries ? timeline.hap_selfreal : [],
          lineStyle: { width: 2, opacity: chartOpacity.hap_selfreal },
          areaStyle: { opacity: 0.06 * chartOpacity.hap_selfreal },
        },
      ],
    };
  }, [chartOpacity, showHappinessSeries, timeline]);

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
      className={cn("h-[380px] w-full rounded-xl", className)}
      aria-label="財務左軸とHAMAスコア右軸のデュアル軸ラインチャート"
    />
  );
}
