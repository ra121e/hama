"use client";

import { useEffect, useState, useCallback } from "react";
import type { FinancialItem, FinancialEntry } from "@/entities/financial-item";
import { useFinancialItems } from "@/features/financial-detail/hooks/useFinancialItems";
import type { SpreadsheetColumn } from "@/features/financial-detail/lib/spreadsheet";
import { generateSpreadsheetColumns } from "@/features/financial-detail/lib/spreadsheet";
export type { SpreadsheetColumn } from "@/features/financial-detail/lib/spreadsheet";

export type SpreadsheetRow = {
	id: string;
	itemId: string;
	name: string;
	level: "large" | "medium" | "small";
	category: string;
	autoCalc: string;
	isAutoCalc: boolean;
	parentId: string | null;
	children: SpreadsheetRow[];
	entries: Map<string, FinancialEntry>;
};

type LoadState = {
	scenarioId: string | null;
	rows: SpreadsheetRow[];
	columns: SpreadsheetColumn[];
	items: FinancialItem[];
	entries: FinancialEntry[];
	isLoading: boolean;
	error: string | null;
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

		return {
			id: item.id,
			itemId: item.id,
			name: item.name,
			level: item.level as "large" | "medium" | "small",
			category: item.category,
			autoCalc: item.autoCalc,
			isAutoCalc: item.autoCalc !== "none",
			parentId: item.parentId,
			entries: entriesByMonth,
			children: buildRowTree(items, entries, item.id),
		};
	});
};

export function useFinancialSpreadsheet(scenarioId: string | null) {
	// 共有の項目読み込みフック
	const { items, isLoading: itemsLoading, error: itemsError } = useFinancialItems();

	const [state, setState] = useState<LoadState>({
		scenarioId: null,
		rows: [],
		columns: [],
		items: [],
		entries: [],
		isLoading: true,
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

			setState({
				scenarioId,
				rows,
				columns,
				items,
				entries: entriesPayload.entries,
				isLoading: false,
				error: null,
			});
		} catch (error) {
			setState((current) => ({
				...current,
				isLoading: false,
				error: error instanceof Error ? error.message : "データ読み込みに失敗しました",
			}));
		}
	}, [scenarioId, items, itemsLoading, itemsError]);

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
		async (itemId: string, periodMonths: string[], value: number) => {
			if (!scenarioId) {
				console.error("scenarioId is not available");
				return;
			}

			const itemEntries = state.entries.filter((entry) => entry.itemId === itemId);
			const entriesByMonth = new Map(itemEntries.map((entry) => [entry.yearMonth, entry] as const));

			try {
				for (const yearMonth of periodMonths) {
					const existingEntry = entriesByMonth.get(yearMonth);

					if (existingEntry) {
						const response = await fetch("/api/financial-entries", {
							method: "PATCH",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								id: existingEntry.id,
								value,
							}),
						});

						if (!response.ok) {
							const error = await response.json();
							throw new Error(error.message || "Failed to update financial entry");
						}
						continue;
					}

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
						throw new Error(error.message || "Failed to create financial entry");
					}
				}

				await new Promise((resolve) => setTimeout(resolve, 100));
				await loadData();
			} catch (error) {
				console.error("Error saving period value:", error);
			}
		},
		[scenarioId, state.entries, loadData]
	);

	return {
		rows: state.rows,
		columns: state.columns,
		isLoading: state.isLoading,
		error: state.error,
		updateEntry,
		createEntry,
		savePeriodValue,
	};
}
