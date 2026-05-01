import { describe, expect, it } from "vitest";
import { resolveFinancialDetailScenarioId } from "../../src/features/financial-detail/lib/activeScenario";

describe("resolveFinancialDetailScenarioId", () => {
	it("prefers explicit scenarioId when provided", () => {
		expect(resolveFinancialDetailScenarioId("custom-plan", "base")).toBe("custom-plan");
	});

	it("falls back to active scenario from store", () => {
		expect(resolveFinancialDetailScenarioId(null, "active-plan")).toBe("active-plan");
	});

	it("uses base when both ids are missing", () => {
		expect(resolveFinancialDetailScenarioId(undefined, undefined)).toBe("base");
	});

	it("treats blank ids as missing", () => {
		expect(resolveFinancialDetailScenarioId("   ", "  ")).toBe("base");
	});
});
