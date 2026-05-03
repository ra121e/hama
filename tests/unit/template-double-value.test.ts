import { describe, expect, it } from "vitest";
import type { FinancialEntry, FinancialItem } from "../../src/entities/financial-item";
import { buildRowTree } from "../../src/features/financial-detail/lib/buildRowTree";

/**
 * テンプレート適用後に値が2倍になる問題の再現テスト
 * 
 * 症状：
 * - フロー項目（収入、支出）の中項目・小項目・大項目すべてで値が2倍になってしまう
 * - テンプレート適用後、月次データが重複して適用されている
 * - 1つの月次値を削除しても合計が半分になるだけで0にならない
 */

describe("テンプレート適用後の重複値の問題", () => {
	it("フロー項目：小項目から大項目への集約で値が2倍にならない", () => {
		const items: FinancialItem[] = [
			// 大項目：収入
			{
				id: "income-large",
				profileId: "profile",
				scenarioId: "scenario",
				level: "large",
				parentId: null,
				name: "収入",
				category: "income",
				autoCalc: "none",
				rate: null,
				sortOrder: 0,
			},
			// 中項目：給与
			{
				id: "salary-medium",
				profileId: "profile",
				scenarioId: "scenario",
				level: "medium",
				parentId: "income-large",
				name: "給与",
				category: "income",
				autoCalc: "none",
				rate: null,
				sortOrder: 0,
			},
			// 小項目：基本給
			{
				id: "salary-base",
				profileId: "profile",
				scenarioId: "scenario",
				level: "small",
				parentId: "salary-medium",
				name: "基本給",
				category: "income",
				autoCalc: "none",
				rate: null,
				sortOrder: 0,
			},
			// 小項目：ボーナス（月次配分）
			{
				id: "salary-bonus",
				profileId: "profile",
				scenarioId: "scenario",
				level: "small",
				parentId: "salary-medium",
				name: "ボーナス（月次配分）",
				category: "income",
				autoCalc: "none",
				rate: null,
				sortOrder: 1,
			},
		];

		const entries: FinancialEntry[] = [
			// 2026-04 のエントリ
			{
				id: "e1",
				scenarioId: "scenario",
				itemId: "salary-base",
				yearMonth: "2026-04",
				value: 480000,
				isExpanded: false,
				memo: null,
			},
			{
				id: "e2",
				scenarioId: "scenario",
				itemId: "salary-bonus",
				yearMonth: "2026-04",
				value: 120000,
				isExpanded: false,
				memo: null,
			},
		];

		const tree = buildRowTree(items, entries);
		const incomeRow = tree[0]; // 大項目：収入

		if (!incomeRow) {
			throw new Error("Income row not found");
		}

		const salaryRow = incomeRow.children[0]; // 中項目：給与

		if (!salaryRow) {
			throw new Error("Salary row not found");
		}

		// 期待値の計算
		const expectedSmallItemsTotal = 480000 + 120000; // 600000
		const salaryMediumValue = salaryRow.entries.get("2026-04")?.value;
		const incomeRawValue = incomeRow.entries.get("2026-04")?.value;

		console.log("=== テンプレート適用後の値の重複チェック ===");
		console.log(`小項目合計（期待値）: ${expectedSmallItemsTotal}`);
		console.log(`中項目の値: ${salaryMediumValue}`);
		console.log(`大項目の値: ${incomeRawValue}`);

		// 中項目は小項目の合計
		expect(salaryMediumValue).toBe(expectedSmallItemsTotal);

		// 大項目は中項目の合計（小項目の合計にはならない）
		expect(incomeRawValue).toBe(expectedSmallItemsTotal);

		// ここで2倍になっていないか確認
		expect(incomeRawValue).not.toBe(expectedSmallItemsTotal * 2);
	});

	it("支出項目：複数中項目から大項目への集約で値が正しい", () => {
		const items: FinancialItem[] = [
			// 大項目：支出
			{
				id: "expense-large",
				profileId: "profile",
				scenarioId: "scenario",
				level: "large",
				parentId: null,
				name: "支出",
				category: "expense",
				autoCalc: "none",
				rate: null,
				sortOrder: 0,
			},
			// 中項目：住居費
			{
				id: "housing-medium",
				profileId: "profile",
				scenarioId: "scenario",
				level: "medium",
				parentId: "expense-large",
				name: "住居費",
				category: "expense",
				autoCalc: "none",
				rate: null,
				sortOrder: 0,
			},
			// 小項目：家賃
			{
				id: "housing-rent",
				profileId: "profile",
				scenarioId: "scenario",
				level: "small",
				parentId: "housing-medium",
				name: "家賃・ローン",
				category: "expense",
				autoCalc: "none",
				rate: null,
				sortOrder: 0,
			},
			// 小項目：光熱費
			{
				id: "housing-utilities",
				profileId: "profile",
				scenarioId: "scenario",
				level: "small",
				parentId: "housing-medium",
				name: "光熱費",
				category: "expense",
				autoCalc: "none",
				rate: null,
				sortOrder: 1,
			},
			// 中項目：食費
			{
				id: "food-medium",
				profileId: "profile",
				scenarioId: "scenario",
				level: "medium",
				parentId: "expense-large",
				name: "食費",
				category: "expense",
				autoCalc: "none",
				rate: null,
				sortOrder: 1,
			},
			// 小項目：食事・飲食
			{
				id: "food-meals",
				profileId: "profile",
				scenarioId: "scenario",
				level: "small",
				parentId: "food-medium",
				name: "食事・飲食",
				category: "expense",
				autoCalc: "none",
				rate: null,
				sortOrder: 0,
			},
		];

		const entries: FinancialEntry[] = [
			// 住居費の小項目
			{
				id: "e1",
				scenarioId: "scenario",
				itemId: "housing-rent",
				yearMonth: "2026-04",
				value: 140000,
				isExpanded: false,
				memo: null,
			},
			{
				id: "e2",
				scenarioId: "scenario",
				itemId: "housing-utilities",
				yearMonth: "2026-04",
				value: 32000,
				isExpanded: false,
				memo: null,
			},
			// 食費の小項目
			{
				id: "e3",
				scenarioId: "scenario",
				itemId: "food-meals",
				yearMonth: "2026-04",
				value: 100000,
				isExpanded: false,
				memo: null,
			},
		];

		const tree = buildRowTree(items, entries);
		const expenseRow = tree[0]; // 大項目：支出

		if (!expenseRow) {
			throw new Error("Expense row not found");
		}

		const housingRow = expenseRow.children[0]; // 中項目：住居費
		const foodRow = expenseRow.children[1]; // 中項目：食費

		if (!housingRow || !foodRow) {
			throw new Error("Medium items not found");
		}

		const expectedHousingTotal = 140000 + 32000; // 172000
		const expectedFoodTotal = 100000;
		const expectedExpenseTotal = expectedHousingTotal + expectedFoodTotal; // 272000

		const housingValue = housingRow.entries.get("2026-04")?.value;
		const foodValue = foodRow.entries.get("2026-04")?.value;
		const expenseValue = expenseRow.entries.get("2026-04")?.value;

		console.log("=== 複数中項目の集約チェック ===");
		console.log(`住居費期待値: ${expectedHousingTotal}, 実値: ${housingValue}`);
		console.log(`食費期待値: ${expectedFoodTotal}, 実値: ${foodValue}`);
		console.log(`支出期待値: ${expectedExpenseTotal}, 実値: ${expenseValue}`);

		expect(housingValue).toBe(expectedHousingTotal);
		expect(foodValue).toBe(expectedFoodTotal);
		expect(expenseValue).toBe(expectedExpenseTotal);

		// 2倍になっていないか確認
		expect(expenseValue).not.toBe(expectedExpenseTotal * 2);
	});

	it("ストック項目：資産の中項目・小項目が正しく集約される", () => {
		const items: FinancialItem[] = [
			// 大項目：資産
			{
				id: "asset-large",
				profileId: "profile",
				scenarioId: "scenario",
				level: "large",
				parentId: null,
				name: "資産",
				category: "asset",
				autoCalc: "none",
				rate: null,
				sortOrder: 0,
			},
			// 中項目：現金・預金
			{
				id: "cash-medium",
				profileId: "profile",
				scenarioId: "scenario",
				level: "medium",
				parentId: "asset-large",
				name: "現金・預金",
				category: "asset",
				autoCalc: "none",
				rate: null,
				sortOrder: 0,
			},
			// 小項目：普通預金
			{
				id: "cash-savings",
				profileId: "profile",
				scenarioId: "scenario",
				level: "small",
				parentId: "cash-medium",
				name: "普通預金",
				category: "asset",
				autoCalc: "none",
				rate: null,
				sortOrder: 0,
			},
			// 小項目：定期預金
			{
				id: "cash-term",
				profileId: "profile",
				scenarioId: "scenario",
				level: "small",
				parentId: "cash-medium",
				name: "定期預金",
				category: "asset",
				autoCalc: "none",
				rate: null,
				sortOrder: 1,
			},
		];

		const entries: FinancialEntry[] = [
			// 2026-04 のエントリ
			{
				id: "e1",
				scenarioId: "scenario",
				itemId: "cash-savings",
				yearMonth: "2026-04",
				value: 3600000,
				isExpanded: false,
				memo: null,
			},
			{
				id: "e2",
				scenarioId: "scenario",
				itemId: "cash-term",
				yearMonth: "2026-04",
				value: 2700000,
				isExpanded: false,
				memo: null,
			},
		];

		const tree = buildRowTree(items, entries);
		const assetRow = tree[0]; // 大項目：資産

		if (!assetRow) {
			throw new Error("Asset row not found");
		}

		const cashRow = assetRow.children[0]; // 中項目：現金・預金

		if (!cashRow) {
			throw new Error("Cash row not found");
		}

		const expectedCashTotal = 3600000 + 2700000; // 6300000
		const cashValue = cashRow.entries.get("2026-04")?.value;
		const assetValue = assetRow.entries.get("2026-04")?.value;

		console.log("=== ストック項目の集約チェック ===");
		console.log(`現金・預金期待値: ${expectedCashTotal}, 実値: ${cashValue}`);
		console.log(`資産期待値: ${expectedCashTotal}, 実値: ${assetValue}`);

		expect(cashValue).toBe(expectedCashTotal);
		expect(assetValue).toBe(expectedCashTotal);

		// 2倍になっていないか確認
		expect(assetValue).not.toBe(expectedCashTotal * 2);
	});
});
