/**
 * useFinancialEntriesForChart.ts
 *
 * DualAxisChart用：FinancialEntry（月次データ）を取得・集約してチャート用に変換
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import type { FinancialEntry } from "@/entities/financial-item";
import {
  aggregateFinancialDataByTimepoints,
  type Timepoint,
} from "@/shared/lib/financial-aggregator";
import { useFinancialItems } from "@/features/financial-detail/hooks/useFinancialItems";
import { useProfileStore } from "@/store/profileStore";

export type ChartFinancialData = {
  hasDetailedData: boolean;
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
  const { items } = useFinancialItems();
  const cacheFinancialData = useProfileStore((state) => state.cacheFinancialData);

  const [state, setState] = useState<LoadState>({
    data: null,
    isLoading: false,
    error: null,
  });

  const loadData = useCallback(async () => {
    if (!scenarioId || items.length === 0) {
      if (scenarioId) {
        cacheFinancialData(scenarioId, null);
      }
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

      const aggregated = aggregateFinancialDataByTimepoints(entries, items);
      const chartData: ChartFinancialData = {
        hasDetailedData: aggregated.hasDetailedData,
        assets: {
          now: aggregated.data.now.assets,
          "5y": aggregated.data["5y"].assets,
          "10y": aggregated.data["10y"].assets,
          "20y": aggregated.data["20y"].assets,
        },
        income: {
          now: aggregated.data.now.income,
          "5y": aggregated.data["5y"].income,
          "10y": aggregated.data["10y"].income,
          "20y": aggregated.data["20y"].income,
        },
        expense: {
          now: aggregated.data.now.expense,
          "5y": aggregated.data["5y"].expense,
          "10y": aggregated.data["10y"].expense,
          "20y": aggregated.data["20y"].expense,
        },
      };

      cacheFinancialData(scenarioId, aggregated.hasDetailedData ? aggregated.data : null);

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
  }, [scenarioId, items, cacheFinancialData]);

  useEffect(() => {
    loadData();
  }, [scenarioId, items, loadData]);

  return state;
}
