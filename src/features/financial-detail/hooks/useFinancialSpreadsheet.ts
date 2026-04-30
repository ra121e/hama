"use client";

import { useEffect, useState, useCallback } from "react";
import type { FinancialItem, FinancialEntry, FinancialAutoCalc, FinancialItemCategory } from "@/entities/financial-item";
import { expandYearlyToMonthly } from "@/features/financial-detail/engine/expandYearlyToMonthly";
import { useFinancialItems } from "@/features/financial-detail/hooks/useFinancialItems";
import type { SpreadsheetColumn } from "@/features/financial-detail/lib/spreadsheet";
import { generateSpreadsheetColumns } from "@/features/financial-detail/lib/spreadsheet";
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
			rate: item.rate,
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
				const isYearlyColumn = options?.columnType === "year" && periodMonths.length === 12;
				const isExpanded = isYearlyColumn;

				const entries = isYearlyColumn
					? expandYearlyToMonthly({
						periodMonths,
						yearlyValue: value,
						category: options?.category ?? "expense",
						autoCalc: options?.autoCalc ?? "none",
						rate: options?.rate,
						eventMonths: options?.eventMonths,
					})
					: periodMonths.map((yearMonth) => ({
						yearMonth,
						value,
						isExpanded,
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
					expandedCount: isYearlyColumn ? entries.length : 0,
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
		isLoading: state.isLoading,
		isSaving: state.isSaving,
		error: state.error,
		updateEntry,
		createEntry,
		savePeriodValue,
	};
}
