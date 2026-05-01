import { describe, expect, it } from "vitest";
import type { FinancialEntry, FinancialItem } from "../../src/entities/financial-item";
import { buildRowTree } from "../../src/features/financial-detail/lib/buildRowTree";

describe("financial spreadsheet row tree", () => {
	it("aggregates medium rows from small rows and large rows from medium rows", () => {
		const items: FinancialItem[] = [
			{ id: "root", profileId: "profile", level: "large", parentId: null, name: "収入", category: "income", autoCalc: "none", rate: null, sortOrder: 0 },
			{ id: "medium-a", profileId: "profile", level: "medium", parentId: "root", name: "給与", category: "income", autoCalc: "none", rate: null, sortOrder: 0 },
			{ id: "medium-b", profileId: "profile", level: "medium", parentId: "root", name: "賞与", category: "income", autoCalc: "none", rate: null, sortOrder: 1 },
			{ id: "small-a1", profileId: "profile", level: "small", parentId: "medium-a", name: "基本給", category: "income", autoCalc: "none", rate: null, sortOrder: 0 },
			{ id: "small-a2", profileId: "profile", level: "small", parentId: "medium-a", name: "残業代", category: "income", autoCalc: "none", rate: null, sortOrder: 1 },
			{ id: "small-b1", profileId: "profile", level: "small", parentId: "medium-b", name: "一時金", category: "income", autoCalc: "none", rate: null, sortOrder: 0 },
		];

		const entries: FinancialEntry[] = [
			{ id: "1", scenarioId: "scenario", itemId: "small-a1", yearMonth: "2026-04", value: 10, isExpanded: false, memo: null },
			{ id: "2", scenarioId: "scenario", itemId: "small-a2", yearMonth: "2026-04", value: 20, isExpanded: false, memo: null },
			{ id: "3", scenarioId: "scenario", itemId: "small-b1", yearMonth: "2026-04", value: 30, isExpanded: false, memo: null },
			{ id: "4", scenarioId: "scenario", itemId: "small-a1", yearMonth: "2026-05", value: 40, isExpanded: false, memo: null },
			{ id: "5", scenarioId: "scenario", itemId: "small-a2", yearMonth: "2026-05", value: 50, isExpanded: false, memo: null },
			{ id: "6", scenarioId: "scenario", itemId: "small-b1", yearMonth: "2026-05", value: 60, isExpanded: false, memo: null },
		];

		const tree = buildRowTree(items, entries);
		const root = tree[0];
		const mediumA = root?.children.find((item) => item.id === "medium-a");
		const mediumB = root?.children.find((item) => item.id === "medium-b");

		expect(mediumA?.entries.get("2026-04")?.value).toBe(30);
		expect(mediumA?.entries.get("2026-05")?.value).toBe(90);
		expect(mediumB?.entries.get("2026-04")?.value).toBe(30);
		expect(mediumB?.entries.get("2026-05")?.value).toBe(60);
		expect(root?.entries.get("2026-04")?.value).toBe(60);
		expect(root?.entries.get("2026-05")?.value).toBe(150);
	});
});
