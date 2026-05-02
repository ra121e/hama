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
		expect(columns.find((column) => column.type === "year")?.label).toContain("（年額）");
		expect(columns.find((column) => column.type === "fiveYear")?.label).toContain("（年額）");
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

	it("shows annual columns as annual amounts instead of monthly averages", () => {
		const columns = generateSpreadsheetColumns(new Date(2026, 3, 1));
		const yearColumn = columns.find((column) => column.type === "year");
		const fiveYearColumn = columns.find((column) => column.type === "fiveYear");
		const createEntries = (periodMonths: string[], perMonthValue = 10) =>
			new Map<string, FinancialEntry>(
				periodMonths.map((yearMonth, index) => [
					yearMonth,
					{ id: String(index + 1), scenarioId: "scenario", itemId: "item", yearMonth, value: perMonthValue, isExpanded: false, memo: null },
				]),
			);

		expect(
			calculateSpreadsheetColumnValue(createEntries(yearColumn?.periodMonths ?? []), {
				id: "year_2027",
				periodMonths: yearColumn?.periodMonths ?? [],
				type: "year",
			}),
		).toBe(120);

		expect(
			calculateSpreadsheetColumnValue(createEntries(fiveYearColumn?.periodMonths ?? [], 10), {
				id: "five_year_2036",
				periodMonths: fiveYearColumn?.periodMonths ?? [],
				type: "fiveYear",
			}),
		).toBe(120);
	});

	it("returns null when the target period has no entry, but keeps explicit zero", () => {
		const emptyEntries = new Map<string, FinancialEntry>();
		expect(
			calculateSpreadsheetColumnValue(emptyEntries, {
				id: "month_2026-04",
				periodMonths: ["2026-04"],
				type: "month",
			}),
		).toBeNull();

		const zeroEntries = new Map<string, FinancialEntry>([
			[
				"2026-04",
				{ id: "z1", scenarioId: "scenario", itemId: "item", yearMonth: "2026-04", value: 0, isExpanded: false, memo: null },
			],
		]);

		expect(
			calculateSpreadsheetColumnValue(zeroEntries, {
				id: "month_2026-04",
				periodMonths: ["2026-04"],
				type: "month",
			}),
		).toBe(0);
	});
});
