import { describe, expect, it, beforeEach, beforeAll, afterAll, vi } from "vitest";
import type { FinancialEntry, FinancialItem } from "../../src/entities/financial-item";
import type { LifecycleTemplate } from "../../src/features/plan/lib/lifecycleTemplates";
import { applyLifecycleTemplate } from "../../src/features/financial-detail/lib/applyLifecycleTemplate";
import { buildRowTree } from "../../src/features/financial-detail/lib/buildRowTree";

/**
 * テンプレート適用後のシナリオ全体をテスト
 * 
 * テンプレート適用 → データ再読込 → スプレッドシート再マウント
 * という流れで、値が正しく表示されるか確認
 */

describe("テンプレート適用後のシナリオテスト", () => {
	beforeAll(() => {
		// テンプレート内の日付（2026-04）を current として扱うため、テスト時刻を固定
		vi.setSystemTime(new Date("2026-04-15T12:00:00Z"));
	});

	afterAll(() => {
		vi.useRealTimers();
	});
	it("テンプレート適用後に、値が正しく表示される（2倍にならない）", async () => {
		// 初期アイテムとエントリ（テンプレート適用前）
		const existingRootItems: FinancialItem[] = [
			{ id: "root-income", profileId: "p", scenarioId: "s", level: "large", parentId: null, name: "収入", category: "income", autoCalc: "none", rate: null, sortOrder: 0 },
			{ id: "root-expense", profileId: "p", scenarioId: "s", level: "large", parentId: null, name: "支出", category: "expense", autoCalc: "none", rate: null, sortOrder: 1 },
			{ id: "root-asset", profileId: "p", scenarioId: "s", level: "large", parentId: null, name: "資産", category: "asset", autoCalc: "none", rate: null, sortOrder: 2 },
			{ id: "root-liability", profileId: "p", scenarioId: "s", level: "large", parentId: null, name: "負債", category: "liability", autoCalc: "none", rate: null, sortOrder: 3 },
		];

		// テンプレート（thirties）
		const template: LifecycleTemplate = {
			id: "thirties",
			title: "30代子育て中",
			description: "教育費や住居費が増えやすい時期",
			timepoint: "now" as const,
			financial: { fin_assets: 9200000, fin_income: 6200000, fin_expense: 4800000 },
			happiness: { hap_time: 58, hap_health: 55, hap_relation: 67, hap_selfreal: 62 },
			financialDetail: {
				items: [
					// 収入
					{ id: "income", level: "large", parentId: null, name: "収入", category: "income", autoCalc: "none", rate: null },
					{ id: "income_salary", level: "medium", parentId: "income", name: "給与", category: "income", autoCalc: "none", rate: null },
					{ id: "income_salary_base", level: "small", parentId: "income_salary", name: "基本給", category: "income", autoCalc: "none", rate: null },
					{ id: "income_salary_bonus", level: "small", parentId: "income_salary", name: "ボーナス（月次配分）", category: "income", autoCalc: "none", rate: null },
					// 支出
					{ id: "expense", level: "large", parentId: null, name: "支出", category: "expense", autoCalc: "none", rate: null },
					{ id: "expense_housing", level: "medium", parentId: "expense", name: "住居費", category: "expense", autoCalc: "none", rate: null },
					{ id: "expense_housing_rent", level: "small", parentId: "expense_housing", name: "家賃・ローン", category: "expense", autoCalc: "none", rate: null },
					{ id: "expense_housing_utilities", level: "small", parentId: "expense_housing", name: "光熱費", category: "expense", autoCalc: "none", rate: null },
				],
				entries: [
					// 2026-04 の給与エントリ
					{ itemId: "income_salary_base", yearMonth: "2026-04", value: 480000 },
					{ itemId: "income_salary_bonus", yearMonth: "2026-04", value: 120000 },
					// 2026-04 の支出エントリ
					{ itemId: "expense_housing_rent", yearMonth: "2026-04", value: 140000 },
					{ itemId: "expense_housing_utilities", yearMonth: "2026-04", value: 32000 },
				],
			},
		};

		const createdItems: FinancialItem[] = [];
		const createdEntries: FinancialEntry[] = [];

		// ステップ1: テンプレート適用
		await applyLifecycleTemplate({
			profileId: "p",
			scenarioId: "s",
			template,
			existingItems: existingRootItems,
			existingEntries: [],
			createItem: async (input) => {
				const created: FinancialItem = {
					id: `created-${createdItems.length}`,
					profileId: input.profileId,
					scenarioId: input.scenarioId,
					level: input.level,
					parentId: input.parentId,
					name: input.name,
					category: input.category,
					autoCalc: input.autoCalc,
					rate: input.rate,
					sortOrder: input.sortOrder,
				};
				createdItems.push(created);
				return created;
			},
			createEntry: async (input) => {
				const created: FinancialEntry = {
					id: `entry-${createdEntries.length}`,
					scenarioId: input.scenarioId,
					itemId: input.itemId,
					yearMonth: input.yearMonth,
					value: input.value,
					isExpanded: input.isExpanded,
					memo: input.memo,
				};
				createdEntries.push(created);
				return created;
			},
		});

		console.log("=== テンプレート適用後 ===");
		console.log(`作成されたアイテム数: ${createdItems.length}`);
		console.log(`作成されたエントリ数: ${createdEntries.length}`);

		// ステップ2: 全アイテムを集約（テンプレート適用後のデータ再読込をシミュレート）
		const allItems = [...existingRootItems, ...createdItems];
		const tree = buildRowTree(allItems, createdEntries);

		console.log("=== buildRowTree 後 ===");
		console.log(`ツリー構造: ${tree.map((r) => r.name).join(", ")}`);

		// ステップ3: 各行のデータを確認
		const incomeRow = tree.find((r) => r.name === "収入");
		const expenseRow = tree.find((r) => r.name === "支出");

		if (!incomeRow || !expenseRow) {
			throw new Error("Income or Expense row not found");
		}

		// 期待値
		const expectedIncomeValue = 480000 + 120000; // 600000
		const expectedExpenseValue = 140000 + 32000; // 172000

		// 実値
		const incomeActualValue = incomeRow.entries.get("2026-04")?.value;
		const expenseActualValue = expenseRow.entries.get("2026-04")?.value;

		console.log("=== 値の確認 ===");
		console.log(`収入期待値: ${expectedIncomeValue}, 実値: ${incomeActualValue}`);
		console.log(`支出期待値: ${expectedExpenseValue}, 実値: ${expenseActualValue}`);

		// 検証
		expect(incomeActualValue).toBe(expectedIncomeValue);
		expect(expenseActualValue).toBe(expectedExpenseValue);

		// 2倍になっていないか
		expect(incomeActualValue).not.toBe(expectedIncomeValue * 2);
		expect(expenseActualValue).not.toBe(expectedExpenseValue * 2);

		// 0になっていないか（削除されていないか）
		expect(incomeActualValue).not.toBe(0);
		expect(expenseActualValue).not.toBe(0);
	});

	it("テンプレート適用後、スプレッドシート再マウント時のシナリオをシミュレート", async () => {
		// ステップ1: テンプレート適用
		const existingRootItems: FinancialItem[] = [
			{ id: "root-income", profileId: "p", scenarioId: "s", level: "large", parentId: null, name: "収入", category: "income", autoCalc: "none", rate: null, sortOrder: 0 },
			{ id: "root-expense", profileId: "p", scenarioId: "s", level: "large", parentId: null, name: "支出", category: "expense", autoCalc: "none", rate: null, sortOrder: 1 },
		];

		const template: LifecycleTemplate = {
			id: "twenties",
			title: "20代",
			description: "20代のテンプレート",
			timepoint: "now" as const,
			financial: { fin_assets: 5000000, fin_income: 4500000, fin_expense: 3200000 },
			happiness: { hap_time: 60, hap_health: 60, hap_relation: 70, hap_selfreal: 65 },
			financialDetail: {
				items: [
					{ id: "income", level: "large", parentId: null, name: "収入", category: "income", autoCalc: "none", rate: null },
					{ id: "income_salary", level: "medium", parentId: "income", name: "給与", category: "income", autoCalc: "none", rate: null },
					{ id: "income_salary_base", level: "small", parentId: "income_salary", name: "基本給", category: "income", autoCalc: "none", rate: null },
					{ id: "expense", level: "large", parentId: null, name: "支出", category: "expense", autoCalc: "none", rate: null },
					{ id: "expense_food", level: "medium", parentId: "expense", name: "食費", category: "expense", autoCalc: "none", rate: null },
					{ id: "expense_food_meals", level: "small", parentId: "expense_food", name: "食事・飲食", category: "expense", autoCalc: "none", rate: null },
				],
				entries: [
					{ itemId: "income_salary_base", yearMonth: "2026-04", value: 400000 },
					{ itemId: "income_salary_base", yearMonth: "2026-05", value: 400000 },
					{ itemId: "expense_food_meals", yearMonth: "2026-04", value: 80000 },
					{ itemId: "expense_food_meals", yearMonth: "2026-05", value: 80000 },
				],
			},
		};

		const createdItems: FinancialItem[] = [];
		const createdEntries: FinancialEntry[] = [];

		await applyLifecycleTemplate({
			profileId: "p",
			scenarioId: "s",
			template,
			existingItems: existingRootItems,
			existingEntries: [],
			createItem: async (input) => {
				const created: FinancialItem = {
					id: `created-${createdItems.length}`,
					profileId: input.profileId,
					scenarioId: input.scenarioId,
					level: input.level,
					parentId: input.parentId,
					name: input.name,
					category: input.category,
					autoCalc: input.autoCalc,
					rate: input.rate,
					sortOrder: input.sortOrder,
				};
				createdItems.push(created);
				return created;
			},
			createEntry: async (input) => {
				const created: FinancialEntry = {
					id: `entry-${createdEntries.length}`,
					scenarioId: input.scenarioId,
					itemId: input.itemId,
					yearMonth: input.yearMonth,
					value: input.value,
					isExpanded: input.isExpanded,
					memo: input.memo,
				};
				createdEntries.push(created);
				return created;
			},
		});

		// ステップ2: スプレッドシート再マウント（新しいインスタンスで再度 buildRowTree を呼ぶ）
		const allItems = [...existingRootItems, ...createdItems];

		// 1回目の再マウント
		const tree1 = buildRowTree(allItems, createdEntries);
		const incomeRow1 = tree1.find((r) => r.name === "収入");
		const expenseRow1 = tree1.find((r) => r.name === "支出");

		// 2回目の再マウント（キーが変わった時）
		const tree2 = buildRowTree(allItems, createdEntries);
		const incomeRow2 = tree2.find((r) => r.name === "収入");
		const expenseRow2 = tree2.find((r) => r.name === "支出");

		if (!incomeRow1 || !expenseRow1 || !incomeRow2 || !expenseRow2) {
			throw new Error("Rows not found");
		}

		console.log("=== 複数回の再マウント確認 ===");
		console.log(`1回目 - 収入（2026-04）: ${incomeRow1.entries.get("2026-04")?.value}`);
		console.log(`2回目 - 収入（2026-04）: ${incomeRow2.entries.get("2026-04")?.value}`);
		console.log(`1回目 - 支出（2026-04）: ${expenseRow1.entries.get("2026-04")?.value}`);
		console.log(`2回目 - 支出（2026-04）: ${expenseRow2.entries.get("2026-04")?.value}`);

		// 両回とも同じ値が返ってくることを確認
		expect(incomeRow1.entries.get("2026-04")?.value).toBe(400000);
		expect(incomeRow2.entries.get("2026-04")?.value).toBe(400000);
		expect(expenseRow1.entries.get("2026-04")?.value).toBe(80000);
		expect(expenseRow2.entries.get("2026-04")?.value).toBe(80000);

		// 2倍になっていないか
		expect(incomeRow1.entries.get("2026-04")?.value).not.toBe(800000);
		expect(incomeRow2.entries.get("2026-04")?.value).not.toBe(800000);
		expect(expenseRow1.entries.get("2026-04")?.value).not.toBe(160000);
		expect(expenseRow2.entries.get("2026-04")?.value).not.toBe(160000);

		// 複数月でも正しい値
		expect(incomeRow1.entries.get("2026-05")?.value).toBe(400000);
		expect(incomeRow2.entries.get("2026-05")?.value).toBe(400000);
	});
});
