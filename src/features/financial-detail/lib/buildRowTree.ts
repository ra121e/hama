import type { FinancialEntry, FinancialItem, FinancialAutoCalc, FinancialItemCategory } from "../../../entities/financial-item";

export type SpreadsheetRow = {
	id: string;
	itemId: string;
	name: string;
	level: "large" | "medium" | "small";
	category: FinancialItemCategory;
	autoCalc: FinancialAutoCalc;
	isAutoCalc: boolean;
	rate: number | null;
	parentId: string | null;
	children: SpreadsheetRow[];
	entries: Map<string, FinancialEntry>;
};

const aggregateEntriesFromChildren = (children: SpreadsheetRow[]): Map<string, FinancialEntry> => {
	const aggregated = new Map<string, FinancialEntry>();
	const totalsByMonth = new Map<string, number>();

	children.forEach((child) => {
		child.entries.forEach((entry, yearMonth) => {
			totalsByMonth.set(yearMonth, (totalsByMonth.get(yearMonth) ?? 0) + entry.value);
		});
	});

	totalsByMonth.forEach((value, yearMonth) => {
		if (value !== 0) {
			aggregated.set(yearMonth, {
				id: `aggregate-${yearMonth}`,
				scenarioId: "",
				itemId: "aggregate",
				yearMonth,
				value,
				isExpanded: false,
				memo: null,
			});
		}
	});

	return aggregated;
};

export const buildRowTree = (
	items: FinancialItem[],
	entries: FinancialEntry[],
	parentId: string | null = null
): SpreadsheetRow[] => {
	const entriesMap = new Map<string, FinancialEntry[]>();
	entries.forEach((entry) => {
		if (!entriesMap.has(entry.itemId)) {
			entriesMap.set(entry.itemId, []);
		}
		entriesMap.get(entry.itemId)!.push(entry);
	});

	const sortedItems = items
		.filter((item) => item.parentId === parentId)
		.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ja"));

	return sortedItems.map((item) => {
		const itemEntries = entriesMap.get(item.id) ?? [];
		const entriesByMonth = new Map<string, FinancialEntry>();
		itemEntries.forEach((entry) => {
			entriesByMonth.set(entry.yearMonth, entry);
		});

		const row: SpreadsheetRow = {
			id: item.id,
			itemId: item.id,
			name: item.name,
			level: item.level as "large" | "medium" | "small",
			category: item.category,
			autoCalc: item.autoCalc,
			isAutoCalc: item.autoCalc !== "none",
			rate: item.rate,
			parentId: item.parentId,
			entries: entriesByMonth,
			children: buildRowTree(items, entries, item.id),
		};

		if (row.children.length > 0 && row.level !== "small") {
			row.entries = aggregateEntriesFromChildren(row.children);
		}

		return row;
	});
};
