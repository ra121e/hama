import { describe, expect, it } from "vitest";
import { lifecycleTemplateSchema } from "../../src/features/plan/lib/lifecycleTemplates";

describe("Template structure with financial detail", () => {
	it("parses template with financial detail items and entries", () => {
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
						level: "large",
						parentId: null,
						name: "収入",
						category: "income",
						autoCalc: "none",
						rate: null,
					},
					{
						level: "medium",
						parentId: "income",
						name: "手取給与",
						category: "income",
						autoCalc: "none",
						rate: null,
					},
					{
						level: "small",
						parentId: "hand_income",
						name: "基本給",
						category: "income",
						autoCalc: "none",
						rate: null,
					},
				],
				entries: [
					{
						itemName: "基本給",
						yearMonth: "2026-04",
						value: 270000,
					},
					{
						itemName: "基本給",
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
		expect(parsed.financialDetail?.items[0].level).toBe("large");
		expect(parsed.financialDetail?.items[1].level).toBe("medium");
		expect(parsed.financialDetail?.items[2].level).toBe("small");
		expect(parsed.financialDetail?.entries[0].itemName).toBe("基本給");
	});

	it("handles template without financial detail (backward compatibility)", () => {
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

	it("validates financial detail items structure", () => {
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
						level: "large",
						parentId: null,
						name: "収入",
						category: "income",
						autoCalc: "depreciation",
						rate: 0.1,
					},
				],
				entries: [
					{
						itemName: "給与",
						yearMonth: "2026-04",
						value: 300000,
					},
				],
			},
		};

		const parsed = lifecycleTemplateSchema.parse(template);

		expect(parsed.financialDetail?.items[0].autoCalc).toBe("depreciation");
		expect(parsed.financialDetail?.items[0].rate).toBe(0.1);
	});

	it("validates category and level fields", () => {
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
						level: "asset",
						parentId: null,
						name: "資産",
						category: "asset",
						autoCalc: "none",
						rate: null,
					},
					{
						level: "liability",
						parentId: null,
						name: "負債",
						category: "liability",
						autoCalc: "none",
						rate: null,
					},
				],
				entries: [],
			},
		};

		// Should throw because level must be one of: large | medium | small
		expect(() => lifecycleTemplateSchema.parse(template)).toThrow();
	});
});
