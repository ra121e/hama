"use client";

import { useEffect, useState, useCallback } from "react";
import type { FinancialItem, FinancialEntry, FinancialAutoCalc, FinancialItemCategory } from "@/entities/financial-item";
import { expandYearlyToMonthly } from "@/features/financial-detail/engine/expandYearlyToMonthly";
import { useFinancialItems } from "@/features/financial-detail/hooks/useFinancialItems";
import type { SpreadsheetColumn } from "@/features/financial-detail/lib/spreadsheet";
import { generateSpreadsheetColumns } from "@/features/financial-detail/lib/spreadsheet";
import { aggregateFinancialDataByTimepoints } from "@/shared/lib/financial-aggregator";
import { useProfileStore } from "@/store/profileStore";
export type { SpreadsheetColumn } from "@/features/financial-detail/lib/spreadsheet";

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

type SavePeriodValueOptions = {
	columnType?: SpreadsheetColumn["type"];
	eventMonths?: number[];
	category?: SpreadsheetRow["category"];
	autoCalc?: SpreadsheetRow["autoCalc"];
	rate?: number | null;
};

type SavePeriodValueResult = {
	ok: boolean;
	expandedCount: number;
	error?: string;
};

type LoadState = {
	scenarioId: string | null;
	rows: SpreadsheetRow[];
	columns: SpreadsheetColumn[];
	items: FinancialItem[];
	entries: FinancialEntry[];
	isLoading: boolean;
	isSaving: boolean;
	error: string | null;
};

/**
 * 大項目の場合、配下の全中項目・小項目の entries を集約する
 */
const aggregateChildEntries = (row: SpreadsheetRow): Map<string, FinancialEntry> => {
	if (row.level !== "large") {
		return row.entries;
	}

	const aggregated = new Map<string, FinancialEntry>();
	const allYearMonths = new Set<string>();

	// 再帰的に全子要素の entries を集約
	const traverse = (currentRow: SpreadsheetRow) => {
		currentRow.entries.forEach((entry) => {
			allYearMonths.add(entry.yearMonth);
		});
		currentRow.children.forEach((child) => {
			traverse(child);
		});
	};

	traverse(row);

	// 各月度ごとに合計を計算
	allYearMonths.forEach((yearMonth) => {
		let totalValue = 0;

		const collectValue = (currentRow: SpreadsheetRow) => {
			const entry = currentRow.entries.get(yearMonth);
			if (entry) {
				totalValue += entry.value;
			}
			currentRow.children.forEach((child) => {
				collectValue(child);
			});
		};

		collectValue(row);

		if (totalValue !== 0) {
			aggregated.set(yearMonth, {
				id: `${row.id}-agg-${yearMonth}`,
				scenarioId: "",
				itemId: row.id,
				yearMonth,
				value: totalValue,
				isExpanded: false,
				memo: null,
			});
		}
	});

	return aggregated;
};

const buildRowTree = (
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

		// 大項目の場合、配下の中項目の entries を集約
		row.entries = aggregateChildEntries(row);

		return row;
	});
};

export function useFinancialSpreadsheet(scenarioId: string | null) {
	// 共有の項目読み込みフック
	const { items, isLoading: itemsLoading, error: itemsError } = useFinancialItems();
	const cacheFinancialData = useProfileStore((state) => state.cacheFinancialData);

	const [state, setState] = useState<LoadState>({
		scenarioId: null,
		rows: [],
		columns: [],
		items: [],
		entries: [],
		isLoading: true,
		isSaving: false,
		error: null,
	});

	const loadData = useCallback(async () => {
		if (!scenarioId) {
			setState((current) => ({
				...current,
				isLoading: false,
				error: "Scenario ID is required",
			}));
			return;
		}

		// 項目がまだ読み込まれていないか、エラーがある場合はスキップ
		if (itemsLoading) {
			return;
		}

		if (itemsError) {
			cacheFinancialData(scenarioId, null);
			setState((current) => ({
				...current,
				isLoading: false,
				error: itemsError,
			}));
			return;
		}

		setState((current) => ({ ...current, isLoading: true, error: null }));

		try {
			// Fetch financial entries for scenario
			const entriesResponse = await fetch(
				`/api/financial-entries?scenarioId=${encodeURIComponent(scenarioId)}`,
				{ cache: "no-store" }
			);
			if (!entriesResponse.ok) {
				throw new Error("Failed to load financial entries");
			}

			const entriesPayload = (await entriesResponse.json()) as {
				scenarioId: string;
				entries: FinancialEntry[];
			};

			const columns = generateSpreadsheetColumns();
			const rows = buildRowTree(items, entriesPayload.entries);
			const aggregated = aggregateFinancialDataByTimepoints(entriesPayload.entries, items);
			cacheFinancialData(scenarioId, aggregated.hasDetailedData ? aggregated.data : null);

			setState({
				scenarioId,
				rows,
				columns,
				items,
				entries: entriesPayload.entries,
				isLoading: false,
				isSaving: false,
				error: null,
			});
		} catch (error) {
			setState((current) => ({
				...current,
				isLoading: false,
				error: error instanceof Error ? error.message : "データ読み込みに失敗しました",
			}));
		}
	}, [scenarioId, items, itemsLoading, itemsError, cacheFinancialData]);

	useEffect(() => {
		loadData();
	}, [scenarioId, items, itemsLoading, itemsError, loadData]);

	const updateEntry = useCallback(
		async (entryId: string, value: number, memo?: string) => {
			try {
				const response = await fetch("/api/financial-entries", {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						id: entryId,
						value,
						memo: memo || undefined,
					}),
				});

				if (!response.ok) {
					const error = await response.json();
					console.error("Failed to update entry:", error);
					return;
				}

				// Reload data after successful update
				await new Promise((resolve) => setTimeout(resolve, 100));
				await loadData();
			} catch (error) {
				console.error("Error updating entry:", error);
			}
		},
		[loadData]
	);

	const createEntry = useCallback(
		async (itemId: string, yearMonth: string, value: number) => {
			if (!scenarioId) {
				console.error("scenarioId is not available");
				return;
			}

			try {
				const response = await fetch("/api/financial-entries", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						scenarioId,
						itemId,
						yearMonth,
						value,
					}),
				});

				if (!response.ok) {
					const error = await response.json();
					console.error("Failed to create entry:", error);
					return;
				}

				// Reload data after successful creation
				await new Promise((resolve) => setTimeout(resolve, 100));
				await loadData();
			} catch (error) {
				console.error("Error creating entry:", error);
			}
		},
		[scenarioId, loadData]
	);

	const savePeriodValue = useCallback(
		async (
			itemId: string,
			periodMonths: string[],
			value: number,
			options?: SavePeriodValueOptions
		): Promise<SavePeriodValueResult> => {
			if (!scenarioId) {
				return {
					ok: false,
					expandedCount: 0,
					error: "scenarioId is not available",
				};
			}

			setState((current) => ({ ...current, isSaving: true, error: null }));

			try {
				const isAnnualExpansionColumn =
					(options?.columnType === "year" || options?.columnType === "fiveYear") &&
					periodMonths.length > 0 &&
					periodMonths.length % 12 === 0;
				const years = isAnnualExpansionColumn ? periodMonths.length / 12 : 1;

				if (!Number.isFinite(value)) {
					throw new Error("入力値が不正です");
				}

				const entries = isAnnualExpansionColumn
					? expandYearlyToMonthly({
						periodMonths,
						yearlyValue: value,
						years,
						category: options?.category ?? "expense",
						autoCalc: options?.autoCalc ?? "none",
						rate: options?.rate,
						eventMonths: options?.eventMonths,
					})
					: periodMonths.map((yearMonth) => ({
						yearMonth,
						value,
						isExpanded: false,
					}));

				const response = await fetch("/api/financial-entries", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						scenarioId,
						itemId,
						entries,
					}),
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.message || "Failed to save financial entries");
				}

				await new Promise((resolve) => setTimeout(resolve, 100));
				await loadData();

				setState((current) => ({ ...current, isSaving: false }));
				return {
					ok: true,
					expandedCount: isAnnualExpansionColumn ? entries.length : 0,
				};
			} catch (error) {
				const message = error instanceof Error ? error.message : "Error saving period value";
				setState((current) => ({
					...current,
					isSaving: false,
					error: message,
				}));
				console.error("Error saving period value:", error);
				return {
					ok: false,
					expandedCount: 0,
					error: message,
				};
			}
		},
		[scenarioId, loadData]
	);

	return {
		rows: state.rows,
		columns: state.columns,
		entries: state.entries,
		isLoading: state.isLoading,
		isSaving: state.isSaving,
		error: state.error,
		updateEntry,
		createEntry,
		savePeriodValue,
	};
}
