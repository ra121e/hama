import type { FinancialEntry, FinancialItem } from "../../../entities/financial-item";
import type {
	LifecycleTemplate,
	LifecycleTemplateFinancialDetailEntry,
	LifecycleTemplateFinancialDetailItem,
} from "../../plan/lib/lifecycleTemplates";
import { getNextSortOrder } from "./financial-items";

type CreateFinancialItemInput = {
	profileId: string;
	scenarioId: string;
	level: FinancialItem["level"];
	parentId: string | null;
	name: string;
	category: FinancialItem["category"];
	autoCalc: FinancialItem["autoCalc"];
	rate: number | null;
	sortOrder: number;
};

type CreateFinancialEntryInput = {
	scenarioId: string;
	itemId: string;
	yearMonth: string;
	value: number;
	isExpanded: boolean;
	memo: string | null;
};

type ApplyTemplateArgs = {
	profileId: string;
	scenarioId: string;
	template: LifecycleTemplate;
	existingItems: FinancialItem[];
	existingEntries: FinancialEntry[];
	createItem: (input: CreateFinancialItemInput) => Promise<FinancialItem>;
	createEntry: (input: CreateFinancialEntryInput) => Promise<FinancialEntry>;
};

const validateFinancialDetail = (
	items: LifecycleTemplateFinancialDetailItem[],
	entries: LifecycleTemplateFinancialDetailEntry[],
) => {
	const itemIds = new Set<string>();

	for (const item of items) {
		if (itemIds.has(item.id)) {
			throw new Error(`Duplicate template item id: ${item.id}`);
		}

		if (item.level === "large" && item.parentId !== null) {
			throw new Error(`Large template item must not have a parent: ${item.id}`);
		}

		if (item.level !== "large") {
			if (!item.parentId) {
				throw new Error(`Template item parent is required: ${item.id}`);
			}

			if (!itemIds.has(item.parentId)) {
				throw new Error(`Template parent must appear before children: ${item.id}`);
			}
		}

		itemIds.add(item.id);
	}

	const entryKeys = new Set<string>();
	for (const entry of entries) {
		if (!itemIds.has(entry.itemId)) {
			throw new Error(`Template entry item not found: ${entry.itemId}`);
		}

		const entryKey = `${entry.itemId}|${entry.yearMonth}`;
		if (entryKeys.has(entryKey)) {
			throw new Error(`Duplicate template entry: ${entryKey}`);
		}
		entryKeys.add(entryKey);
	}
};

export async function applyLifecycleTemplate({
	profileId,
	scenarioId,
	template,
	existingItems,
	existingEntries,
	createItem,
	createEntry,
}: ApplyTemplateArgs) {
	if (!template.financialDetail) {
		throw new Error("Template must include financial detail");
	}

	validateFinancialDetail(template.financialDetail.items, template.financialDetail.entries);

	const resolvedItems = [...existingItems];
	const templateIdToDbId = new Map<string, string>();
	const existingEntriesByKey = new Set(existingEntries.map((entry) => `${entry.itemId}|${entry.yearMonth}`));
	const existingRootItems = new Map<FinancialItem["category"], FinancialItem>();

	for (const item of existingItems) {
		if (item.level === "large" && item.parentId === null && !existingRootItems.has(item.category)) {
			existingRootItems.set(item.category, item);
		}
	}

	let itemsCreated = 0;
	let entriesCreated = 0;

	// 現在の年月の月初を基準に、それ以前のエントリは適用しない
	const now = new Date();
	const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

	const isBeforeCurrentMonth = (yearMonth: string) => {
		const parts = yearMonth.split("-");
		if (parts.length < 2) return false;
		const y = Number(parts[0]);
		const m = Number(parts[1]);
		if (Number.isNaN(y) || Number.isNaN(m)) return false;
		const d = new Date(y, m - 1, 1);
		return d < currentMonthStart;
	};
	for (const templateItem of template.financialDetail.items) {
		if (templateItem.level === "large") {
			const rootItem = existingRootItems.get(templateItem.category);
			if (!rootItem) {
				throw new Error(`Fixed root item not found: ${templateItem.category}`);
			}

			templateIdToDbId.set(templateItem.id, rootItem.id);
			continue;
		}

		if (!templateItem.parentId) {
			throw new Error(`Template parent is missing: ${templateItem.id}`);
		}

		const parentTemplateId = templateItem.parentId;
		const parentId = templateIdToDbId.get(parentTemplateId);
		if (!parentId) {
			throw new Error(`Parent item not found: ${parentTemplateId}`);
		}

		const existingItem = resolvedItems.find(
			(item) =>
				item.parentId === parentId &&
				item.level === templateItem.level &&
				item.category === templateItem.category &&
				item.name === templateItem.name,
		);

		if (existingItem) {
			templateIdToDbId.set(templateItem.id, existingItem.id);
			continue;
		}

		const createdItem = await createItem({
			profileId,
			scenarioId,
			level: templateItem.level,
			parentId,
			name: templateItem.name,
			category: templateItem.category,
			autoCalc: templateItem.autoCalc,
			rate: templateItem.rate,
			sortOrder: getNextSortOrder(resolvedItems, parentId),
		});

		resolvedItems.push(createdItem);
		templateIdToDbId.set(templateItem.id, createdItem.id);
		itemsCreated += 1;
	}

	for (const entry of template.financialDetail.entries) {
		const dbItemId = templateIdToDbId.get(entry.itemId);
		if (!dbItemId) {
			throw new Error(`Item not found for entry: ${entry.itemId}`);
		}

		// 過去月は適用しない
		if (isBeforeCurrentMonth(entry.yearMonth)) {
			continue;
		}

		const entryKey = `${dbItemId}|${entry.yearMonth}`;
		if (existingEntriesByKey.has(entryKey)) {
			continue;
		}

		await createEntry({
			scenarioId,
			itemId: dbItemId,
			yearMonth: entry.yearMonth,
			value: entry.value,
			isExpanded: false,
			memo: null,
		});
		existingEntriesByKey.add(entryKey);
		entriesCreated += 1;
	}

	return {
		itemsCreated,
		entriesCreated,
	};
}
