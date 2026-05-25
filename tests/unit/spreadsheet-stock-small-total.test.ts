import { describe, expect, it } from "vitest";
import type { FinancialEntry } from "../../src/entities/financial-item";
import { calculateSpreadsheetColumnValue, generateSpreadsheetColumns } from "../../src/features/financial-detail/lib/spreadsheet";

describe("spreadsheet stock small totals", () => {
  it("returns latest balance for stock monthly block totals and sum for flow", () => {
    const entries = new Map<string, FinancialEntry>([
      ["2026-04", { id: "1", scenarioId: "s", itemId: "i", yearMonth: "2026-04", value: 100, isExpanded: false, memo: null }],
      ["2026-05", { id: "2", scenarioId: "s", itemId: "i", yearMonth: "2026-05", value: 200, isExpanded: false, memo: null }],
      ["2026-06", { id: "3", scenarioId: "s", itemId: "i", yearMonth: "2026-06", value: 300, isExpanded: false, memo: null }],
    ]);

    const column = { id: "total_month_block_1", periodMonths: ["2026-04", "2026-05", "2026-06"], type: "total" } as const;

    // stock: should return latest (300)
    expect(calculateSpreadsheetColumnValue(entries, column, true)).toBe(300);

    // flow: should return sum (600)
    expect(calculateSpreadsheetColumnValue(entries, column, false)).toBe(600);
  });

  it("does not fall back before the grand-total period for stock items", () => {
    const columns = generateSpreadsheetColumns(new Date(2026, 3, 1));
    const grandTotalColumn = columns.at(-1);
    const previousColumn = columns.at(-2);

    expect(grandTotalColumn?.id).toBe("total");
    expect(grandTotalColumn?.periodMonths).toEqual(previousColumn?.periodMonths);

    if (!grandTotalColumn || !previousColumn) {
      throw new Error("Expected generated columns");
    }

    const previousPeriodLastMonth = previousColumn.periodMonths.at(-1);
    if (!previousPeriodLastMonth) {
      throw new Error("Expected previous period months");
    }

    const oldEntries = new Map<string, FinancialEntry>([
      ["2026-04", { id: "old", scenarioId: "s", itemId: "i", yearMonth: "2026-04", value: 100, isExpanded: false, memo: null }],
    ]);

    expect(calculateSpreadsheetColumnValue(oldEntries, grandTotalColumn, true)).toBeNull();

    const currentPeriodEntries = new Map<string, FinancialEntry>([
      [previousPeriodLastMonth, { id: "latest", scenarioId: "s", itemId: "i", yearMonth: previousPeriodLastMonth, value: 900, isExpanded: false, memo: null }],
    ]);

    expect(calculateSpreadsheetColumnValue(currentPeriodEntries, grandTotalColumn, true)).toBe(900);
  });
});
