import { describe, expect, it } from "vitest";
import type { FinancialEntry } from "../../src/entities/financial-item";
import { calculateSpreadsheetColumnValue } from "../../src/features/financial-detail/lib/spreadsheet";

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
});
