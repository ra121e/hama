import { describe, expect, it } from "vitest";
import { expandYearlyToMonthly } from "../../src/features/financial-detail/engine/expandYearlyToMonthly";

describe("expandYearlyToMonthly", () => {
	const months = [
		"2030-01",
		"2030-02",
		"2030-03",
		"2030-04",
		"2030-05",
		"2030-06",
		"2030-07",
		"2030-08",
		"2030-09",
		"2030-10",
		"2030-11",
		"2030-12",
	];

	it("distributes fixed yearly value evenly across 12 months", () => {
		const result = expandYearlyToMonthly({
			periodMonths: months,
			yearlyValue: 1200,
			category: "income",
			autoCalc: "none",
		});

		expect(result).toHaveLength(12);
		expect(result.every((entry) => entry.value === 100)).toBe(true);
		expect(result.every((entry) => entry.isExpanded)).toBe(true);
	});

	it("concentrates irregular expense to specified event months", () => {
		const result = expandYearlyToMonthly({
			periodMonths: months,
			yearlyValue: 1200,
			category: "expense",
			autoCalc: "none",
			eventMonths: [6, 12],
		});

		expect(result.find((entry) => entry.yearMonth === "2030-06")?.value).toBe(600);
		expect(result.find((entry) => entry.yearMonth === "2030-12")?.value).toBe(600);
		expect(result.filter((entry) => entry.value === 0)).toHaveLength(10);
	});

	it("prepares monthly compound progression for auto-calculated entries", () => {
		const result = expandYearlyToMonthly({
			periodMonths: months,
			yearlyValue: 120000,
			category: "asset",
			autoCalc: "compound",
			rate: 12,
		});

		expect(result[0].value).toBeGreaterThan(120000);
		expect(result[11].value).toBeGreaterThan(result[0].value);
	});
});
