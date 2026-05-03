import { describe, expect, it } from "vitest";
import type { FinancialEntry, FinancialItem } from "../../src/entities/financial-item";
import { buildRowTree } from "../../src/features/financial-detail/lib/buildRowTree";

/**
 * aggregateEntriesFromChildren のロジックが正しいかテスト
 * 
 * 問題の仮説：
 * 子の entries が、既に親によって集約されている場合、
 * それを再度集約すると2倍になる可能性
 */

describe("buildRowTree - aggregateEntriesFromChildren の重複チェック", () => {
	it("中項目の entries が小項目から集約され、大項目に集約されるまでのフロー", () => {
		const items: FinancialItem[] = [
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
		];

		const entries: FinancialEntry[] = [
			{
				id: "e1",
				scenarioId: "scenario",
				itemId: "salary-base",
				yearMonth: "2026-04",
				value: 480000,
				isExpanded: false,
				memo: null,
			},
		];

		const tree = buildRowTree(items, entries);
		const incomeRow = tree[0]; // 大項目
		const salaryRow = incomeRow?.children[0]; // 中項目
		const salaryBaseRow = salaryRow?.children[0]; // 小項目

		if (!incomeRow || !salaryRow || !salaryBaseRow) {
			throw new Error("Row tree structure not found");
		}

		// 小項目のデータ
		const smallItemValue = salaryBaseRow.entries.get("2026-04")?.value;
		console.log("=== 階層別エントリ確認 ===");
		console.log(`小項目（salary-base） entries:`, salaryBaseRow.entries);
		console.log(`小項目の値: ${smallItemValue}`);

		// 中項目のデータ（小項目から集約）
		const mediumItemValue = salaryRow.entries.get("2026-04")?.value;
		console.log(`中項目（salary-medium） entries:`, salaryRow.entries);
		console.log(`中項目の値: ${mediumItemValue}`);

		// 大項目のデータ（中項目から集約）
		const largeItemValue = incomeRow.entries.get("2026-04")?.value;
		console.log(`大項目（income-large） entries:`, incomeRow.entries);
		console.log(`大項目の値: ${largeItemValue}`);

		// 検証：重複がないか
		expect(smallItemValue).toBe(480000);
		expect(mediumItemValue).toBe(480000); // 小項目の合計
		expect(largeItemValue).toBe(480000); // 中項目の合計（小項目の合計と同じ）

		// 2倍になっていないか
		expect(largeItemValue).not.toBe(960000);
		expect(mediumItemValue).not.toBe(960000);
	});

	it("小項目が複数ある場合、正しく加算されるか", () => {
		const items: FinancialItem[] = [
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
		const incomeRow = tree[0];
		const salaryRow = incomeRow?.children[0];

		if (!incomeRow || !salaryRow) {
			throw new Error("Row not found");
		}

		const salaryMediumValue = salaryRow.entries.get("2026-04")?.value;
		const incomeValue = incomeRow.entries.get("2026-04")?.value;

		console.log("=== 複数小項目の集約確認 ===");
		console.log(`中項目の値: ${salaryMediumValue}`);
		console.log(`大項目の値: ${incomeValue}`);

		// 期待値
		const expected = 480000 + 120000; // 600000

		expect(salaryMediumValue).toBe(expected);
		expect(incomeValue).toBe(expected);

		// 2倍になっていないか
		expect(incomeValue).not.toBe(expected * 2);
		expect(salaryMediumValue).not.toBe(expected * 2);
	});

	it("中項目のchildren配列に自分自身が含まれていないか", () => {
		const items: FinancialItem[] = [
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
		];

		const entries: FinancialEntry[] = [
			{
				id: "e1",
				scenarioId: "scenario",
				itemId: "salary-base",
				yearMonth: "2026-04",
				value: 480000,
				isExpanded: false,
				memo: null,
			},
		];

		const tree = buildRowTree(items, entries);
		const incomeRow = tree[0];
		const salaryRow = incomeRow?.children[0];

		if (!incomeRow || !salaryRow) {
			throw new Error("Row not found");
		}

		// 大項目の children に中項目が含まれているか
		console.log("=== 大項目の children 確認 ===");
		console.log(`大項目の children count: ${incomeRow.children.length}`);
		console.log(`大項目の children IDs: ${incomeRow.children.map((c) => c.id)}`);

		expect(incomeRow.children).toHaveLength(1);
		expect(incomeRow.children[0]?.id).toBe("salary-medium");

		// 中項目の children に小項目が含まれているか
		console.log(`中項目の children count: ${salaryRow.children.length}`);
		console.log(`中項目の children IDs: ${salaryRow.children.map((c) => c.id)}`);

		expect(salaryRow.children).toHaveLength(1);
		expect(salaryRow.children[0]?.id).toBe("salary-base");
	});
});
