/**
 * AggregateDebugPanel.tsx
 *
 * F06開発用：financial-aggregator による集約結果をデバッグ表示
 * F06完了後は削除予定
 */

"use client";

import { useMemo } from "react";
import { useFinancialSpreadsheet } from "@/features/financial-detail/hooks/useFinancialSpreadsheet";
import {
  aggregateTo4Timepoints,
  aggregateToYearly,
  getMonthlyEntries,
} from "@/shared/lib/financial-aggregator";

type AggregateDebugPanelProps = {
  scenarioId: string | null;
  visible?: boolean;
};

export function AggregateDebugPanel({ scenarioId, visible = true }: AggregateDebugPanelProps) {
  const { entries, isLoading, error } = useFinancialSpreadsheet(scenarioId);

  const aggregatedData = useMemo(() => {
    if (!entries || entries.length === 0) {
      return null;
    }

    // 項目IDごとにエントリをグループ化
    const byItemId = new Map<string, typeof entries>();
    for (const entry of entries) {
      if (!byItemId.has(entry.itemId)) {
        byItemId.set(entry.itemId, []);
      }
      byItemId.get(entry.itemId)!.push(entry);
    }

    // 各項目について集約結果を計算
    const itemAggregates: Record<string, {
      balance4Points: Record<string, number | null>;
      flow4Points: Record<string, number | null>;
      yearly: Record<string, { balance: number; flow: number }>;
      recent36Count: number;
    }> = {};
    for (const [itemId, itemEntries] of byItemId.entries()) {
      // 4時点データ（両方のタイプを試す）
      const balance4Points = aggregateTo4Timepoints(itemEntries, "balance");
      const flow4Points = aggregateTo4Timepoints(itemEntries, "flow");

      // 年次データ
      const yearly = aggregateToYearly(itemEntries);

      // 直近36ヶ月
      const recent36 = getMonthlyEntries(itemEntries, 36);

      itemAggregates[itemId] = {
        balance4Points,
        flow4Points,
        yearly,
        recent36Count: recent36.length,
      };
    }

    return itemAggregates;
  }, [entries]);

  if (!visible || isLoading) {
    return null;
  }

  if (error || !aggregatedData || Object.keys(aggregatedData).length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-dashed border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-700">
        {error ? `エラー: ${error}` : "集約データなし"}
      </div>
    );
  }

  return (
    <details className="mt-6 rounded-lg border border-dashed border-blue-300 bg-blue-50 p-4">
      <summary className="cursor-pointer font-semibold text-blue-700">
        🔍 集約デバッグ情報 (F06開発用)
      </summary>
      <div className="mt-4 space-y-4 text-xs">
        {Object.entries(aggregatedData).map(([itemId, data]) => (
          <div key={itemId} className="rounded border border-blue-200 bg-white p-2">
            <div className="font-mono font-bold text-blue-600">{itemId}</div>
            <div className="mt-2 space-y-1 text-gray-600">
              <div>
                <strong>4時点（残高系）:</strong>{" "}
                <span className="font-mono">
                  now: {data.balance4Points.now}, 5y: {data.balance4Points["5y"]}, 10y:{" "}
                  {data.balance4Points["10y"]}, 20y: {data.balance4Points["20y"]}
                </span>
              </div>
              <div>
                <strong>4時点（フロー系）:</strong>{" "}
                <span className="font-mono">
                  now: {data.flow4Points.now}, 5y: {data.flow4Points["5y"]}, 10y:{" "}
                  {data.flow4Points["10y"]}, 20y: {data.flow4Points["20y"]}
                </span>
              </div>
              <div>
                <strong>年次集約:</strong>{" "}
                <span className="font-mono">{Object.keys(data.yearly).join(", ")}</span>
              </div>
              <div>
                <strong>直近36ヶ月:</strong> <span className="font-mono">{data.recent36Count}件</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
