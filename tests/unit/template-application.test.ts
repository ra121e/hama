import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import type { FinancialEntry, FinancialItem } from "../../src/entities/financial-item";
import type { LifecycleTemplate } from "../../src/features/plan/lib/lifecycleTemplates";
import { applyLifecycleTemplate } from "../../src/features/financial-detail/lib/applyLifecycleTemplate";

const makeItem = (overrides: Partial<FinancialItem>): FinancialItem => ({
	id: overrides.id ?? "item",
	profileId: overrides.profileId ?? "profile-1",
	level: overrides.level ?? "medium",
	parentId: overrides.parentId ?? null,
	name: overrides.name ?? "項目",
	category: overrides.category ?? "income",
	autoCalc: overrides.autoCalc ?? "none",
	rate: overrides.rate ?? null,
	sortOrder: overrides.sortOrder ?? 0,
});

const makeEntry = (overrides: Partial<FinancialEntry>): FinancialEntry => ({
	id: overrides.id ?? "entry",
	scenarioId: overrides.scenarioId ?? "scenario-1",
	itemId: overrides.itemId ?? "item",
	yearMonth: overrides.yearMonth ?? "2026-04",
	value: overrides.value ?? 0,
	isExpanded: overrides.isExpanded ?? false,
	memo: overrides.memo ?? null,
});

describe("applyLifecycleTemplate", () => {
	beforeAll(() => {
		// テンプレート内の "2026-04" を current として扱うため、テスト時刻を固定
		vi.setSystemTime(new Date("2026-04-15T12:00:00Z"));
	});

	afterAll(() => {
		vi.useRealTimers();
	});
	it("creates only missing descendants after existing parents", async () => {
		const existingItems = [
			makeItem({ id: "root-income", level: "large", parentId: null, name: "収入", category: "income", sortOrder: 0 }),
			makeItem({ id: "root-expense", level: "large", parentId: null, name: "支出", category: "expense", sortOrder: 1 }),
			makeItem({ id: "root-assets", level: "large", parentId: null, name: "資産", category: "asset", sortOrder: 2 }),
			makeItem({ id: "root-liabilities", level: "large", parentId: null, name: "負債", category: "liability", sortOrder: 3 }),
			makeItem({ id: "income-salary", level: "medium", parentId: "root-income", name: "手取給与", category: "income", sortOrder: 0 }),
		];

		const template: LifecycleTemplate = {
			id: "twenties",
			title: "20代",
			description: "test",
			timepoint: "now" as const,
			financial: {
				fin_assets: 1,
				fin_income: 1,
				fin_expense: 1,
			},
			happiness: {
				hap_time: 1,
				hap_health: 1,
				hap_relation: 1,
				hap_selfreal: 1,
			},
			financialDetail: {
				items: [
					{ id: "income", level: "large", parentId: null, name: "収入", category: "income", autoCalc: "none", rate: null },
					{ id: "income_salary", level: "medium", parentId: "income", name: "手取給与", category: "income", autoCalc: "none", rate: null },
					{ id: "income_salary_base", level: "small", parentId: "income_salary", name: "基本給", category: "income", autoCalc: "none", rate: null },
				],
				entries: [
					{ itemId: "income_salary_base", yearMonth: "2026-04", value: 270000 },
				],
			},
		};

		const createdItems: FinancialItem[] = [];
		const createdEntries: FinancialEntry[] = [];

		const result = await applyLifecycleTemplate({
			profileId: "profile-1",
			scenarioId: "scenario-1",
			template,
			existingItems,
			existingEntries: [],
			createItem: async (input) => {
				const created = makeItem({
					id: `created-${createdItems.length + 1}`,
					profileId: input.profileId,
					level: input.level,
					parentId: input.parentId,
					name: input.name,
					category: input.category,
					autoCalc: input.autoCalc,
					rate: input.rate,
					sortOrder: input.sortOrder,
				});
				createdItems.push(created);
				return created;
			},
			createEntry: async (input) => {
				const created = makeEntry({
					id: `entry-${createdEntries.length + 1}`,
					scenarioId: input.scenarioId,
					itemId: input.itemId,
					yearMonth: input.yearMonth,
					value: input.value,
					isExpanded: input.isExpanded,
					memo: input.memo,
				});
				createdEntries.push(created);
				return created;
			},
		});

		expect(result.itemsCreated).toBe(1);
		expect(result.entriesCreated).toBe(1);
		expect(createdItems).toHaveLength(1);
		expect(createdItems[0].parentId).toBe("income-salary");
		expect(createdEntries[0].itemId).toBe("created-1");
	});

	it("skips items and entries that already exist", async () => {
		const existingItems = [
			makeItem({ id: "root-income", level: "large", parentId: null, name: "収入", category: "income", sortOrder: 0 }),
			makeItem({ id: "root-expense", level: "large", parentId: null, name: "支出", category: "expense", sortOrder: 1 }),
			makeItem({ id: "root-assets", level: "large", parentId: null, name: "資産", category: "asset", sortOrder: 2 }),
			makeItem({ id: "root-liabilities", level: "large", parentId: null, name: "負債", category: "liability", sortOrder: 3 }),
			makeItem({ id: "income-salary", level: "medium", parentId: "root-income", name: "手取給与", category: "income", sortOrder: 0 }),
			makeItem({ id: "income-base", level: "small", parentId: "income-salary", name: "基本給", category: "income", sortOrder: 0 }),
		];

		const existingEntries = [
			makeEntry({ id: "existing-entry", scenarioId: "scenario-1", itemId: "income-base", yearMonth: "2026-04", value: 270000 }),
		];

		const template: LifecycleTemplate = {
			id: "twenties",
			title: "20代",
			description: "test",
			timepoint: "now" as const,
			financial: {
				fin_assets: 1,
				fin_income: 1,
				fin_expense: 1,
			},
			happiness: {
				hap_time: 1,
				hap_health: 1,
				hap_relation: 1,
				hap_selfreal: 1,
			},
			financialDetail: {
				items: [
					{ id: "income", level: "large", parentId: null, name: "収入", category: "income", autoCalc: "none", rate: null },
					{ id: "income_salary", level: "medium", parentId: "income", name: "手取給与", category: "income", autoCalc: "none", rate: null },
					{ id: "income_salary_base", level: "small", parentId: "income_salary", name: "基本給", category: "income", autoCalc: "none", rate: null },
				],
				entries: [
					{ itemId: "income_salary_base", yearMonth: "2026-04", value: 270000 },
				],
			},
		};

		const createdItems: FinancialItem[] = [];
		const createdEntries: FinancialEntry[] = [];

		const result = await applyLifecycleTemplate({
			profileId: "profile-1",
			scenarioId: "scenario-1",
			template,
			existingItems,
			existingEntries,
			createItem: async (input) => {
				const created = makeItem({
					id: `created-${createdItems.length + 1}`,
					profileId: input.profileId,
					level: input.level,
					parentId: input.parentId,
					name: input.name,
					category: input.category,
					autoCalc: input.autoCalc,
					rate: input.rate,
					sortOrder: input.sortOrder,
				});
				createdItems.push(created);
				return created;
			},
			createEntry: async (input) => {
				const created = makeEntry({
					id: `entry-${createdEntries.length + 1}`,
					scenarioId: input.scenarioId,
					itemId: input.itemId,
					yearMonth: input.yearMonth,
					value: input.value,
					isExpanded: input.isExpanded,
					memo: input.memo,
				});
				createdEntries.push(created);
				return created;
			},
		});

		expect(result.itemsCreated).toBe(0);
		expect(result.entriesCreated).toBe(0);
		expect(createdItems).toHaveLength(0);
		expect(createdEntries).toHaveLength(0);
	});
});