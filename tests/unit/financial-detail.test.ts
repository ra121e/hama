import { describe, expect, it } from "vitest";
import type { FinancialItem } from "../../src/entities/financial-item";
import { buildFinancialItemTree, FIXED_ROOT_FINANCIAL_ITEMS, getDescendantIds } from "../../src/features/financial-detail/lib/financial-items";
import { createFinancialItemSchema } from "../../src/features/financial-detail/schema";

describe("financial detail helpers", () => {
	it("keeps the fixed root categories in the expected order", () => {
		expect(FIXED_ROOT_FINANCIAL_ITEMS.map((item) => item.label)).toEqual(["収入", "支出", "資産", "負債"]);
	});

	it("builds a stable tree from flat items", () => {
		const items: FinancialItem[] = [
			{
				id: "medium-2",
				profileId: "profile",
				level: "medium",
				parentId: "income-root",
				name: "ボーナス",
				category: "income",
				autoCalc: "none",
				rate: null,
				sortOrder: 1,
			},
			{
				id: "income-root",
				profileId: "profile",
				level: "large",
				parentId: null,
				name: "収入",
				category: "income",
				autoCalc: "none",
				rate: null,
				sortOrder: 0,
			},
			{
				id: "medium-1",
				profileId: "profile",
				level: "medium",
				parentId: "income-root",
				name: "給与",
				category: "income",
				autoCalc: "none",
				rate: null,
				sortOrder: 0,
			},
			{
				id: "small-1",
				profileId: "profile",
				level: "small",
				parentId: "medium-1",
				name: "基本給",
				category: "income",
				autoCalc: "none",
				rate: null,
				sortOrder: 0,
			},
		];

		const tree = buildFinancialItemTree(items);

		expect(tree[0]?.children.map((item) => item.id)).toEqual(["medium-1", "medium-2"]);
		expect(tree[0]?.children[0]?.children[0]?.id).toBe("small-1");
	});

	it("validates create payloads", () => {
		expect(
			createFinancialItemSchema.parse({
				profileId: "profile",
				scenarioId: "scenario",
				parentId: "root",
				name: "  家賃  ",
			}),
		).toMatchObject({ name: "家賃" });
	});

	it("collects descendants recursively", () => {
		const items: FinancialItem[] = [
			{ id: "root", profileId: "profile", scenarioId: "scenario", level: "large", parentId: null, name: "収入", category: "income", autoCalc: "none", rate: null, sortOrder: 0 },
			{ id: "child", profileId: "profile", scenarioId: "scenario", level: "medium", parentId: "root", name: "給与", category: "income", autoCalc: "none", rate: null, sortOrder: 0 },
			{ id: "grandchild", profileId: "profile", scenarioId: "scenario", level: "small", parentId: "child", name: "基本給", category: "income", autoCalc: "none", rate: null, sortOrder: 0 },
		];

		expect(getDescendantIds(items, "root")).toEqual(["child", "grandchild"]);
	});
});
