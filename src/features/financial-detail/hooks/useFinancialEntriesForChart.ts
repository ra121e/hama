/**
 * useFinancialEntriesForChart.ts
 *
 * DualAxisChart用：FinancialEntry（月次データ）を取得・集約してチャート用に変換
 */

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { FinancialEntry, FinancialItem } from "@/entities/financial-item";
import {
  aggregateTo4Timepoints,
  type Timepoint,
} from "@/shared/lib/financial-aggregator";
import { useFinancialItems } from "@/features/financial-detail/hooks/useFinancialItems";

export type ChartFinancialData = {
  assets: Record<Timepoint, number>;
  income: Record<Timepoint, number>;
  expense: Record<Timepoint, number>;
};

type LoadState = {
  data: ChartFinancialData | null;
  isLoading: boolean;
  error: string | null;
};

/**
 * scenarioId に対して FinancialEntry を取得し、チャート用に4時点集約データへ変換
 */
export function useFinancialEntriesForChart(scenarioId: string | null): LoadState {
  const { items, isLoading: itemsLoading } = useFinancialItems();

  const [state, setState] = useState<LoadState>({
    data: null,
    isLoading: false,
    error: null,
  });

  // itemId -> FinancialItem のマップ
  const itemsById = useMemo(() => {
    const map = new Map<string, FinancialItem>();
    for (const item of items) {
      map.set(item.id, item);
    }
    return map;
  }, [items]);

  const loadData = useCallback(async () => {
    if (!scenarioId || items.length === 0) {
      setState({ data: null, isLoading: false, error: null });
      return;
    }

    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const response = await fetch(
        `/api/financial-entries?scenarioId=${encodeURIComponent(scenarioId)}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("Failed to load financial entries");
      }

      const payload = (await response.json()) as {
        scenarioId: string;
        entries: FinancialEntry[];
      };

      const entries = payload.entries;

      // 項目IDごとにエントリをグループ化
      const byItemId = new Map<string, FinancialEntry[]>();
      for (const entry of entries) {
        if (!byItemId.has(entry.itemId)) {
          byItemId.set(entry.itemId, []);
        }
        byItemId.get(entry.itemId)!.push(entry);
      }

      // 各項目を集約
      const chartData: ChartFinancialData = {
        assets: { now: 0, "5y": 0, "10y": 0, "20y": 0 },
        income: { now: 0, "5y": 0, "10y": 0, "20y": 0 },
        expense: { now: 0, "5y": 0, "10y": 0, "20y": 0 },
      };

      // itemId から FinancialItem を参照して category を判定
      for (const [itemId, itemEntries] of byItemId.entries()) {
        const item = itemsById.get(itemId);
        if (!item) {
          continue;
        }

        const category = item.category;

        // 残高系 vs フロー系 で集約方法を選択
        const aggregationType = (category === "asset" || category === "liability")
          ? "balance"
          : "flow";

        const timepoints = aggregateTo4Timepoints(itemEntries, aggregationType);

        // category ごとに値を加算
        if (category === "asset") {
          chartData.assets.now += timepoints.now;
          chartData.assets["5y"] += timepoints["5y"];
          chartData.assets["10y"] += timepoints["10y"];
          chartData.assets["20y"] += timepoints["20y"];
        } else if (category === "liability") {
          // 負債は資産から差し引く（負の値）
          chartData.assets.now -= timepoints.now;
          chartData.assets["5y"] -= timepoints["5y"];
          chartData.assets["10y"] -= timepoints["10y"];
          chartData.assets["20y"] -= timepoints["20y"];
        } else if (category === "income") {
          chartData.income.now += timepoints.now;
          chartData.income["5y"] += timepoints["5y"];
          chartData.income["10y"] += timepoints["10y"];
          chartData.income["20y"] += timepoints["20y"];
        } else if (category === "expense") {
          chartData.expense.now += timepoints.now;
          chartData.expense["5y"] += timepoints["5y"];
          chartData.expense["10y"] += timepoints["10y"];
          chartData.expense["20y"] += timepoints["20y"];
        }
      }

      setState({
        data: chartData,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState({
        data: null,
        isLoading: false,
        error: error instanceof Error ? error.message : "データ読み込みに失敗しました",
      });
    }
  }, [scenarioId, items, itemsById]);

  useEffect(() => {
    loadData();
  }, [scenarioId, items, loadData]);

  return state;
}
