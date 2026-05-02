import { describe, expect, it } from "vitest";
import { lifecycleTemplateSchema } from "../../src/features/plan/lib/lifecycleTemplates";

describe("Template structure with financial detail", () => {
	it("parses template with id-based financial detail items and entries", () => {
		const template = {
			id: "twenties",
			title: "20代社会人スタート",
			description: "テンプレート",
			timepoint: "now" as const,
			financial: {
				fin_assets: 1200000,
				fin_income: 3800000,
				fin_expense: 2400000,
			},
			happiness: {
				hap_time: 68,
				hap_health: 72,
				hap_relation: 60,
				hap_selfreal: 78,
			},
			financialDetail: {
				items: [
					{
						id: "income",
						level: "large",
						parentId: null,
						name: "収入",
						category: "income",
						autoCalc: "none",
						rate: null,
					},
					{
						id: "income_salary",
						level: "medium",
						parentId: "income",
						name: "手取給与",
						category: "income",
						autoCalc: "none",
						rate: null,
					},
					{
						id: "income_salary_base",
						level: "small",
						parentId: "income_salary",
						name: "基本給",
						category: "income",
						autoCalc: "none",
						rate: null,
					},
				],
				entries: [
					{
						itemId: "income_salary_base",
						yearMonth: "2026-04",
						value: 270000,
					},
					{
						itemId: "income_salary_base",
						yearMonth: "2026-05",
						value: 270000,
					},
				],
			},
		};

		const parsed = lifecycleTemplateSchema.parse(template);

		expect(parsed.id).toBe("twenties");
		expect(parsed.financialDetail).toBeDefined();
		expect(parsed.financialDetail?.items).toHaveLength(3);
		expect(parsed.financialDetail?.entries).toHaveLength(2);
		expect(parsed.financialDetail?.items[0].id).toBe("income");
		expect(parsed.financialDetail?.items[1].parentId).toBe("income");
		expect(parsed.financialDetail?.entries[0].itemId).toBe("income_salary_base");
	});

	it("handles template without financial detail", () => {
		const template = {
			id: "twenties",
			title: "20代",
			description: "テンプレート",
			timepoint: "now" as const,
			financial: {
				fin_assets: 1200000,
				fin_income: 3800000,
				fin_expense: 2400000,
			},
			happiness: {
				hap_time: 68,
				hap_health: 72,
				hap_relation: 60,
				hap_selfreal: 78,
			},
		};

		const parsed = lifecycleTemplateSchema.parse(template);

		expect(parsed.id).toBe("twenties");
		expect(parsed.financialDetail).toBeUndefined();
	});

	it("rejects entries that omit itemId", () => {
		const template = {
			id: "twenties",
			title: "20代",
			description: "テンプレート",
			timepoint: "now" as const,
			financial: {
				fin_assets: 1200000,
				fin_income: 3800000,
				fin_expense: 2400000,
			},
			happiness: {
				hap_time: 68,
				hap_health: 72,
				hap_relation: 60,
				hap_selfreal: 78,
			},
			financialDetail: {
				items: [
					{
						id: "income",
						level: "large",
						parentId: null,
						name: "収入",
						category: "income",
						autoCalc: "none",
						rate: null,
					},
				],
				entries: [
					{
						yearMonth: "2026-04",
						value: 300000,
					},
				],
			},
		};

		expect(() => lifecycleTemplateSchema.parse(template)).toThrow();
	});
});
