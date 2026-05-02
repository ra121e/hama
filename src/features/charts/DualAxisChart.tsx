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
import { useFinancialEntriesForChart } from "@/features/financial-detail/hooks/useFinancialEntriesForChart";
import { cn } from "@/lib/utils";
import type { Snapshot } from "@/entities/scenario";
import type { Timepoint } from "@/shared/lib/financial-aggregator";

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

const applySnapshotToPoint = (point: PointData, snapshots: Snapshot[]) => {
  const next = { ...point };

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

  return next;
};

export function DualAxisChart({ className, showHappinessSeries = true }: DualAxisChartProps) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  const profile = useProfileStore((state) => state.profile);
  const activeScenarioId = useProfileStore((state) => state.activeScenarioId);
  const snapshotsByScenario = useProfileStore((state) => state.snapshotsByScenario);
  const chartOpacity = useUIStore((state) => state.chartOpacity);

  // F06：FinancialEntry（月次データ）から4時点への集約データを取得
  const financialEntriesData = useFinancialEntriesForChart(activeScenarioId);

  const timeline = useMemo(() => {
    const scenarioSnapshots = snapshotsByScenario[activeScenarioId] ?? {};
    const basePointFromProfile = createBasePoint(profile);

    const points: PointData[] = [];

    for (const timepoint of TIMEPOINTS) {
      const key = timepoint.key as Timepoint;
      const snapshotsForTimepoint = scenarioSnapshots[key] ?? [];

      // 財務データ：FinancialEntry の集約データがあればそちらを優先、なければ Snapshot → プロファイル
      const financialData = financialEntriesData.data;
      const hasFinancialEntries = Boolean(financialData?.hasDetailedData);

      let point: PointData;
      if (hasFinancialEntries && financialData) {
        // FinancialEntry データを使用
        point = {
          assets: financialData.assets[key] ?? 0,
          income: financialData.income[key] ?? 0,
          expense: financialData.expense[key] ?? 0,
          // ハッピー項目は Snapshot から取得
          hap_time: 0,
          hap_health: 0,
          hap_relation: 0,
          hap_selfreal: 0,
        };
      } else {
        // Snapshot データを使用（従来通り）
        point = {
          ...basePointFromProfile,
        };
        point = applySnapshotToPoint(point, snapshotsForTimepoint);
      }

      // ハッピー項目は常に Snapshot を適用（FinancialEntry には存在しない）
      // 既に applySnapshotToPoint で設定されているか、basePointFromProfile から取得している
      if (hasFinancialEntries && financialData) {
        // FinancialEntry 使用時も Snapshot でハッピー項目を上書き
        const happinessSnapshot = snapshotsForTimepoint.filter(
          (s) => s.categoryId === "happiness"
        );
        if (happinessSnapshot.length > 0) {
          point = applySnapshotToPoint(point, happinessSnapshot);
        } else {
          // Snapshot にハッピー項目がなければ、前の時点のハッピー値を引き継ぐ
          if (points.length > 0) {
            point.hap_time = points[points.length - 1].hap_time;
            point.hap_health = points[points.length - 1].hap_health;
            point.hap_relation = points[points.length - 1].hap_relation;
            point.hap_selfreal = points[points.length - 1].hap_selfreal;
          } else {
            point.hap_time = basePointFromProfile.hap_time;
            point.hap_health = basePointFromProfile.hap_health;
            point.hap_relation = basePointFromProfile.hap_relation;
            point.hap_selfreal = basePointFromProfile.hap_selfreal;
          }
        }
      }

      points.push(point);
    }

    const scoreSeries = points.map((point) =>
      Math.round(
        calcHamaScore(
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
        ),
      ),
    );

    return {
      labels: TIMEPOINTS.map((item) => item.label),
      assets: points.map((point) => toManYen(point.assets)),
      income: points.map((point) => toManYen(point.income)),
      expense: points.map((point) => toManYen(point.expense)),
      balance: points.map((point) => toManYen(point.income - point.expense)),
      hap_time: points.map((point) => point.hap_time),
      hap_health: points.map((point) => point.hap_health),
      hap_relation: points.map((point) => point.hap_relation),
      hap_selfreal: points.map((point) => point.hap_selfreal),
      hama: scoreSeries,
    };
  }, [activeScenarioId, profile, snapshotsByScenario, financialEntriesData.data]);

  const financialAxisRange = useMemo(() => {
    const values = [...timeline.assets, ...timeline.income, ...timeline.expense, ...timeline.balance];
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const span = Math.max(1, rawMax - rawMin);

    const negativeRoom = Math.max(Math.abs(rawMax) * 0.2, span * 0.2, 1);
    const min = Math.min(rawMin - span * 0.05, -negativeRoom);
    const max = rawMax + span * 0.1;

    return {
      min: Number(min.toFixed(2)),
      max: Number(max.toFixed(2)),
    };
  }, [timeline]);

  const scoreAxisRange = useMemo(() => {
    const scoreMax = 100;
    const leftMin = financialAxisRange.min;
    const leftMax = financialAxisRange.max;
    const leftSpan = leftMax - leftMin;

    if (leftSpan <= 0 || leftMax <= 0) {
      return { min: 0, max: scoreMax };
    }

    const zeroRatio = Math.min(0.95, Math.max(0, -leftMin / leftSpan));
    if (zeroRatio === 0) {
      return { min: 0, max: scoreMax };
    }

    const scoreMin = -((zeroRatio * scoreMax) / (1 - zeroRatio));
    return {
      min: Number(scoreMin.toFixed(2)),
      max: scoreMax,
    };
  }, [financialAxisRange.max, financialAxisRange.min]);

  const option = useMemo<EChartsOption>(() => {
    return {
      color: ["#f3e7c3", "#a7c7ff", "#f4b0b0", "#9edbb0", "#f1a8a8", "#86d4c3", "#f5c98a", "#b5df7b", "#8cc7d9"],
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "line",
        },
      },
      legend: {
        top: 6,
        selectedMode: "multiple",
        textStyle: {
          color: "#52525b",
        },
      },
      grid: {
        left: 56,
        right: 56,
        top: 84,
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
          nameLocation: "middle",
          nameGap: 46,
          min: financialAxisRange.min,
          max: financialAxisRange.max,
          axisLabel: {
            formatter: (value: number) => `${value}`,
          },
        },
        {
          type: "value",
          name: "スコア（0-100）",
          position: "right",
          nameLocation: "middle",
          nameGap: 46,
          min: scoreAxisRange.min,
          max: scoreAxisRange.max,
          axisLabel: {
            formatter: (value: number) => {
              if (value < 0 || value > 100) {
                return "";
              }

              const rounded = Math.round(value);
              if (rounded % 20 !== 0) {
                return "";
              }

              return `${rounded}`;
            },
          },
        },
      ],
      series: [
        {
          name: "総資産",
          type: "line",
          yAxisIndex: 0,
          smooth: true,
          data: timeline.assets,
          symbol: "none",
          lineStyle: { width: 0, opacity: chartOpacity.financial },
          areaStyle: { color: "#f3e7c3", opacity: 0.28 * chartOpacity.financial },
        },
        {
          name: "収入",
          type: "line",
          yAxisIndex: 0,
          smooth: true,
          data: timeline.income,
          symbol: "none",
          lineStyle: { width: 0, opacity: chartOpacity.financial },
          areaStyle: { color: "#a7c7ff", opacity: 0.28 * chartOpacity.financial },
        },
        {
          name: "支出",
          type: "line",
          yAxisIndex: 0,
          smooth: true,
          data: timeline.expense,
          symbol: "none",
          lineStyle: { width: 0, opacity: chartOpacity.financial },
          areaStyle: { color: "#f4b0b0", opacity: 0.28 * chartOpacity.financial },
        },
        {
          name: "収支差額（収入-支出）",
          type: "line",
          yAxisIndex: 0,
          smooth: true,
          data: timeline.balance,
          symbol: "none",
          lineStyle: { width: 0, opacity: chartOpacity.financial },
          areaStyle: { origin: "auto", color: "#9edbb0", opacity: 0.3 * chartOpacity.financial },
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
        },
        {
          name: "健康",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          data: showHappinessSeries ? timeline.hap_health : [],
          lineStyle: { width: 2, opacity: chartOpacity.hap_health },
        },
        {
          name: "人間関係",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          data: showHappinessSeries ? timeline.hap_relation : [],
          lineStyle: { width: 2, opacity: chartOpacity.hap_relation },
        },
        {
          name: "自己実現",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          data: showHappinessSeries ? timeline.hap_selfreal : [],
          lineStyle: { width: 2, opacity: chartOpacity.hap_selfreal },
        },
      ],
    };
  }, [chartOpacity, financialAxisRange.max, financialAxisRange.min, scoreAxisRange.max, scoreAxisRange.min, showHappinessSeries, timeline]);

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
      aria-label="財務左軸とスコア右軸のデュアル軸チャート"
    />
  );
}
