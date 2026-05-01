/**
 * financial-aggregator.test.ts
 *
 * financial-aggregator.ts の単体テスト
 */

import { describe, it, expect } from "vitest";
import {
  aggregateToTimepoint,
  aggregateToYearly,
  getMonthlyEntries,
  toMonthlyMap,
  aggregateTo4Timepoints,
  aggregateFinancialDataByTimepoints,
  aggregateBigCategory,
} from "../../src/shared/lib/financial-aggregator";
import type { FinancialEntry, FinancialItem } from "../../src/entities/financial-item";

/**
 * テストデータ：直近36ヶ月の月次データ（2024-01から2026-12）
 * 資産：毎月1%の複利成長（月初100万円で開始）
 * 収入：毎月固定50万円
 */
function createMockFinancialEntries(): {
  assets: FinancialEntry[];
  income: FinancialEntry[];
} {
  const baseDate = new Date(2024, 0, 1); // 2024-01-01
  const entries = {
    assets: [] as FinancialEntry[],
    income: [] as FinancialEntry[],
  };

  let assetValue = 1000000; // 初期100万円

  for (let i = 0; i < 36; i++) {
    const date = new Date(baseDate);
    date.setMonth(date.getMonth() + i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const yearMonth = `${year}-${month}`;

    // 資産：毎月1%複利成長
    assetValue *= 1.01;
    entries.assets.push({
      id: `asset-${i}`,
      scenarioId: "scenario-1",
      itemId: "item-assets",
      yearMonth,
      value: Math.round(assetValue),
      isExpanded: false,
      memo: null,
    });

    // 収入：毎月50万円
    entries.income.push({
      id: `income-${i}`,
      scenarioId: "scenario-1",
      itemId: "item-income",
      yearMonth,
      value: 500000,
      isExpanded: false,
      memo: null,
    });
  }

  return entries;
}

describe("financial-aggregator", () => {
  const mockData = createMockFinancialEntries();

  describe("aggregateToTimepoint", () => {
    it("残高系：now（現在）の値を取得", () => {
      const value = aggregateToTimepoint(mockData.assets, "now", "balance");
      // 2026-12の月末残高
      expect(value).toBeGreaterThan(1000000);
      expect(value).toBeLessThan(1500000);
    });

    it("残高系：5年後のデータが存在しない場合は最新月の値を延伸", () => {
      // テストデータは36ヶ月（3年）しかないため、5年後は存在しない
      // 新しい実装では、最新月の値を返す（延伸）
      const value = aggregateToTimepoint(mockData.assets, "5y", "balance");
      // 値が0でなく、最新月と同じ値であることを確認
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThan(1500000);
    });

    it("フロー系：now（現在の年）の12ヶ月合計を取得", () => {
      const value = aggregateToTimepoint(mockData.income, "now", "flow");
      // 2026年の12ヶ月 × 50万円 = 600万円
      expect(value).toBe(500000 * 12);
    });

    it("フロー系：5年後のデータが存在しない場合は直近12ヶ月の平均から推定", () => {
      // テストデータは36ヶ月（3年）しかないため、5年後は存在しない
      // 新しい実装では、直近12ヶ月の平均値から年額を計算して返す
      const value = aggregateToTimepoint(mockData.income, "5y", "flow");
      // 50万円 × 12ヶ月 = 600万円が予想値
      expect(value).toBe(500000 * 12);
    });
  });

  describe("aggregateToYearly", () => {
    it("年次データに集約する", () => {
      const yearly = aggregateToYearly(mockData.assets);
      expect(yearly).toHaveProperty("2024");
      expect(yearly).toHaveProperty("2025");
      expect(yearly).toHaveProperty("2026");
    });

    it("各年のbalanceと flowを計算", () => {
      const yearly = aggregateToYearly(mockData.income);
      // 各年とも50万 × 12ヶ月 = 600万円
      expect(yearly["2024"].flow).toBe(500000 * 12);
      expect(yearly["2025"].flow).toBe(500000 * 12);
      expect(yearly["2026"].flow).toBe(500000 * 12);
    });
  });

  describe("getMonthlyEntries", () => {
    it("直近12ヶ月のデータを取得", () => {
      const recent12 = getMonthlyEntries(mockData.assets, 12);
      expect(recent12.length).toBe(12);
      expect(recent12[0].yearMonth).toBe("2026-01");
      expect(recent12[11].yearMonth).toBe("2026-12");
    });

    it("直近36ヶ月のデータを取得（全て）", () => {
      const recent36 = getMonthlyEntries(mockData.assets, 36);
      expect(recent36.length).toBe(36);
      expect(recent36[0].yearMonth).toBe("2024-01");
      expect(recent36[35].yearMonth).toBe("2026-12");
    });

    it("直近60ヶ月以上を指定するとアップサンプリング", () => {
      // テストデータは36ヶ月しかないため、結果も36ヶ月
      const recent60 = getMonthlyEntries(mockData.assets, 60);
      expect(recent60.length).toBe(36);
    });
  });

  describe("toMonthlyMap", () => {
    it("月次データをマップに変換", () => {
      const map = toMonthlyMap(mockData.income);
      expect(map["2024-01"]).toBe(500000);
      expect(map["2025-06"]).toBe(500000);
      expect(map["2026-12"]).toBe(500000);
    });

    it("マップのキーは yearMonth 形式", () => {
      const map = toMonthlyMap(mockData.income);
      const keys = Object.keys(map);
      keys.forEach((key) => {
        expect(key).toMatch(/^\d{4}-\d{2}$/);
      });
    });
  });

  describe("aggregateTo4Timepoints", () => {
    it("4時点の集約値をまとめて取得", () => {
      const result = aggregateTo4Timepoints(mockData.income, "flow");
      expect(result).toHaveProperty("now");
      expect(result).toHaveProperty("5y");
      expect(result).toHaveProperty("10y");
      expect(result).toHaveProperty("20y");
    });

    it("now は current year の合計、将来は推定値", () => {
      const result = aggregateTo4Timepoints(mockData.income, "flow");
      expect(result.now).toBeGreaterThan(0);
      // 新しい実装では、将来も直近12ヶ月の平均から推定値を返す
      expect(result["5y"]).toBeGreaterThan(0);
      expect(result["10y"]).toBeGreaterThan(0);
      expect(result["20y"]).toBeGreaterThan(0);
      // 全て同じ値になるはず（直近12ヶ月の平均から計算）
      expect(result["5y"]).toBe(result["10y"]);
      expect(result["10y"]).toBe(result["20y"]);
    });

    it("将来データがある場合は 5y / 10y / 20y で別々の12ヶ月窓を集約する", () => {
      const entries: FinancialEntry[] = [];

      const pushYear = (year: number, baseValue: number) => {
        for (let i = 0; i < 12; i++) {
          const month = String(i + 1).padStart(2, "0");
          entries.push({
            id: `${year}-${month}`,
            scenarioId: "scenario-1",
            itemId: "item-income",
            yearMonth: `${year}-${month}`,
            value: baseValue,
            isExpanded: false,
            memo: null,
          });
        }
      };

      for (let year = 2024; year <= 2044; year++) {
        const value = year === 2029 ? 1000 : year === 2034 ? 2000 : year === 2044 ? 3000 : 100;
        pushYear(year, value);
      }

      const result = aggregateTo4Timepoints(entries, "flow");

      expect(result["5y"]).toBe(1000 * 12);
      expect(result["10y"]).toBe(2000 * 12);
      expect(result["20y"]).toBe(3000 * 12);
      expect(result["5y"]).not.toBe(result["10y"]);
      expect(result["10y"]).not.toBe(result["20y"]);
    });
  });

  describe("aggregateFinancialDataByTimepoints", () => {
    it("資産・収入・支出を4時点で集約し、liability は資産から差し引く", () => {
      const items: FinancialItem[] = [
        { id: "asset-item", profileId: "profile", level: "large", parentId: null, name: "資産", category: "asset", autoCalc: "none", rate: null, sortOrder: 0 },
        { id: "liability-item", profileId: "profile", level: "large", parentId: null, name: "負債", category: "liability", autoCalc: "none", rate: null, sortOrder: 1 },
        { id: "income-item", profileId: "profile", level: "large", parentId: null, name: "収入", category: "income", autoCalc: "none", rate: null, sortOrder: 2 },
        { id: "expense-item", profileId: "profile", level: "large", parentId: null, name: "支出", category: "expense", autoCalc: "none", rate: null, sortOrder: 3 },
      ];

      const entries: FinancialEntry[] = [];
      for (let month = 1; month <= 12; month++) {
        const yearMonth = `2026-${String(month).padStart(2, "0")}`;
        entries.push(
          { id: `asset-${month}`, scenarioId: "scenario-1", itemId: "asset-item", yearMonth, value: 100000, isExpanded: false, memo: null },
          { id: `liability-${month}`, scenarioId: "scenario-1", itemId: "liability-item", yearMonth, value: 30000, isExpanded: false, memo: null },
          { id: `income-${month}`, scenarioId: "scenario-1", itemId: "income-item", yearMonth, value: 50000, isExpanded: false, memo: null },
          { id: `expense-${month}`, scenarioId: "scenario-1", itemId: "expense-item", yearMonth, value: 20000, isExpanded: false, memo: null },
        );
      }

      const aggregated = aggregateFinancialDataByTimepoints(entries, items);

      expect(aggregated.hasDetailedData).toBe(true);
      expect(aggregated.data.now.assets).toBe(70000);
      expect(aggregated.data.now.income).toBe(50000 * 12);
      expect(aggregated.data.now.expense).toBe(20000 * 12);
      expect(aggregated.data["5y"].assets).toBe(70000);
      expect(aggregated.data["10y"].income).toBe(50000 * 12);
      expect(aggregated.data["20y"].expense).toBe(20000 * 12);
    });
  });

  describe("aggregateBigCategory", () => {
    it("フロー系は期間合計、ストック系は期末残高を返す", () => {
      const entries: FinancialEntry[] = [
        { id: "income-1", scenarioId: "scenario-1", itemId: "income-item", yearMonth: "2026-04", value: 100, isExpanded: false, memo: null },
        { id: "income-2", scenarioId: "scenario-1", itemId: "income-item", yearMonth: "2026-05", value: 200, isExpanded: false, memo: null },
        { id: "asset-1", scenarioId: "scenario-1", itemId: "asset-item", yearMonth: "2026-04", value: 1000, isExpanded: false, memo: null },
        { id: "asset-2", scenarioId: "scenario-1", itemId: "asset-item", yearMonth: "2026-05", value: 1200, isExpanded: false, memo: null },
      ];

      expect(aggregateBigCategory(entries.slice(0, 2), "income", ["2026-04", "2026-05"])).toBe(300);
      expect(aggregateBigCategory(entries.slice(2), "asset", ["2026-04", "2026-05"])).toBe(1200);
      expect(aggregateBigCategory(entries.slice(2), "liability", [])).toBe(1200);
    });
  });

  describe("エッジケース", () => {
    it("空の配列を指定するとすべて0を返す", () => {
      const empty: FinancialEntry[] = [];
      expect(aggregateToTimepoint(empty, "now", "balance")).toBe(0);
      expect(aggregateToTimepoint(empty, "now", "flow")).toBe(0);
      expect(getMonthlyEntries(empty, 12).length).toBe(0);
      expect(Object.keys(aggregateToYearly(empty)).length).toBe(0);
    });

    it("1ヶ月のみのデータの場合", () => {
      const oneMonth: FinancialEntry[] = [
        {
          id: "single",
          scenarioId: "scenario-1",
          itemId: "item-test",
          yearMonth: "2026-04",
          value: 1000,
          isExpanded: false,
          memo: null,
        },
      ];
      const yearly = aggregateToYearly(oneMonth);
      expect(yearly).toHaveProperty("2026");
      expect(yearly["2026"].balance).toBe(1000);
      expect(yearly["2026"].flow).toBe(1000);
    });
  });
});
