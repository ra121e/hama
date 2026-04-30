import { describe, expect, it } from "vitest";
import type { FinancialEntry } from "../../src/entities/financial-item";
import { calculateSpreadsheetColumnValue, generateSpreadsheetColumns } from "../../src/features/financial-detail/lib/spreadsheet";

describe("spreadsheet columns", () => {
	it("inserts a total column after every 12 months and keeps the grand total last", () => {
		const columns = generateSpreadsheetColumns(new Date(2026, 3, 1));
		const monthlyTotals = columns.filter((column) => column.type === "total" && column.id !== "total");

		expect(monthlyTotals).toHaveLength(3);
		expect(columns.at(-1)?.id).toBe("total");
		expect(columns[12]?.type).toBe("total");
		expect(columns[25]?.type).toBe("total");
		expect(columns[38]?.type).toBe("total");
		expect(columns.find((column) => column.type === "fiveYear")?.label).toContain("5年単位（年額）");
	});

	it("calculates subtotal columns as a sum and the grand total from all entries", () => {
		const entries = new Map<string, FinancialEntry>([
			["2026-04", { id: "1", scenarioId: "scenario", itemId: "item", yearMonth: "2026-04", value: 10, isExpanded: false, memo: null }],
			["2026-05", { id: "2", scenarioId: "scenario", itemId: "item", yearMonth: "2026-05", value: 20, isExpanded: false, memo: null }],
			["2026-06", { id: "3", scenarioId: "scenario", itemId: "item", yearMonth: "2026-06", value: 30, isExpanded: false, memo: null }],
		]);

		expect(
			calculateSpreadsheetColumnValue(entries, {
				id: "total_month_block_1",
				periodMonths: ["2026-04", "2026-05", "2026-06"],
				type: "total",
			}),
		).toBe(60);

		expect(
			calculateSpreadsheetColumnValue(entries, {
				id: "total",
				periodMonths: [],
				type: "total",
			}),
		).toBe(60);
	});
});
