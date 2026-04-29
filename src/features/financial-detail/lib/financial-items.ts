import type { FinancialItem } from "@/entities/financial-item";

export const FIXED_ROOT_FINANCIAL_ITEMS = [
	{ category: "income", label: "収入" },
	{ category: "expense", label: "支出" },
	{ category: "asset", label: "資産" },
	{ category: "liability", label: "負債" },
] as const;

export type FinancialItemTreeNode = FinancialItem & {
	children: FinancialItemTreeNode[];
};

const compareFinancialItems = (left: FinancialItem, right: FinancialItem) => {
	if (left.sortOrder !== right.sortOrder) {
		return left.sortOrder - right.sortOrder;
	}

	if (left.name !== right.name) {
		return left.name.localeCompare(right.name, "ja");
	}

	return left.id.localeCompare(right.id, "ja");
};

export const sortFinancialItems = (items: FinancialItem[]) => {
	return [...items].sort(compareFinancialItems);
};

export const buildFinancialItemTree = (items: FinancialItem[]) => {
	const groupedByParent = new Map<string | null, FinancialItem[]>();

	for (const item of items) {
		const groupedItems = groupedByParent.get(item.parentId) ?? [];
		groupedItems.push(item);
		groupedByParent.set(item.parentId, groupedItems);
	}

	const buildChildren = (parentId: string | null): FinancialItemTreeNode[] => {
		return sortFinancialItems(groupedByParent.get(parentId) ?? []).map((item) => ({
			...item,
			children: buildChildren(item.id),
		}));
	};

	return buildChildren(null);
};

export const getNextSortOrder = (items: FinancialItem[], parentId: string | null) => {
	const siblingItems = items.filter((item) => item.parentId === parentId);
	return siblingItems.length === 0 ? 0 : Math.max(...siblingItems.map((item) => item.sortOrder)) + 1;
};

export const getSiblingOrder = (items: FinancialItem[], parentId: string | null) => {
	return sortFinancialItems(items.filter((item) => item.parentId === parentId));
};

export const getDescendantIds = (items: FinancialItem[], itemId: string) => {
	const result: string[] = [];
	const queue = [itemId];

	while (queue.length > 0) {
		const currentId = queue.shift();
		if (!currentId) {
			continue;
		}

		for (const item of items.filter((candidate) => candidate.parentId === currentId)) {
			result.push(item.id);
			queue.push(item.id);
		}
	}

	return result;
};

export const getLevelLabel = (level: FinancialItem["level"]) => {
	switch (level) {
		case "large":
			return "大項目";
		case "medium":
			return "中項目";
		case "small":
			return "小項目";
	}
};

export const getRootLabel = (category: FinancialItem["category"]) => {
	return FIXED_ROOT_FINANCIAL_ITEMS.find((item) => item.category === category)?.label ?? category;
};
