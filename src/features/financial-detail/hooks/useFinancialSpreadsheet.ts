"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { FinancialItem, FinancialEntry, FinancialAutoCalc, FinancialItemCategory } from "@/entities/financial-item";
import { expandYearlyToMonthly } from "@/features/financial-detail/engine/expandYearlyToMonthly";
import { useFinancialItems } from "@/features/financial-detail/hooks/useFinancialItems";
import type { SpreadsheetColumn } from "@/features/financial-detail/lib/spreadsheet";
import { generateSpreadsheetColumns } from "@/features/financial-detail/lib/spreadsheet";
import { aggregateFinancialDataByTimepoints } from "@/shared/lib/financial-aggregator";
import { useProfileStore } from "@/store/profileStore";
import { buildRowTree, type SpreadsheetRow } from "@/features/financial-detail/lib/buildRowTree";
import { resolveFinancialDetailScenarioId } from "@/features/financial-detail/lib/activeScenario";
export type { SpreadsheetColumn } from "@/features/financial-detail/lib/spreadsheet";

type SavePeriodValueOptions = {
	columnType?: SpreadsheetColumn["type"];
	eventMonths?: number[];
	category?: SpreadsheetRow["category"];
	autoCalc?: SpreadsheetRow["autoCalc"];
	rate?: number | null;
	// The first yearMonth of the column where the user edited (e.g. "2026-01").
	// When provided for stock categories, expansion will be applied only for months >= this value.
	startMonth?: string | null;
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


export function useFinancialSpreadsheet(scenarioId?: string | null) {
	// 共有の項目読み込みフック
	const { items, isLoading: itemsLoading, error: itemsError } = useFinancialItems();
	const activeScenarioId = useProfileStore((state) => state.activeScenarioId);
	const cacheFinancialData = useProfileStore((state) => state.cacheFinancialData);
	const resolvedScenarioId = resolveFinancialDetailScenarioId(scenarioId, activeScenarioId);
	const latestScenarioIdRef = useRef<string | null>(resolvedScenarioId);

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

	useEffect(() => {
		latestScenarioIdRef.current = resolvedScenarioId;
	}, [resolvedScenarioId]);

	const loadData = useCallback(async () => {
		const targetScenarioId = resolvedScenarioId;

		if (!targetScenarioId) {
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
			cacheFinancialData(targetScenarioId, null);
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
				`/api/financial-entries?scenarioId=${encodeURIComponent(targetScenarioId)}`,
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
			cacheFinancialData(targetScenarioId, aggregated.hasDetailedData ? aggregated.data : null);

			if (latestScenarioIdRef.current !== targetScenarioId) {
				return;
			}

			setState({
				scenarioId: targetScenarioId,
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
				scenarioId: targetScenarioId,
				isLoading: false,
				error: error instanceof Error ? error.message : "データ読み込みに失敗しました",
			}));
		}
	}, [resolvedScenarioId, items, itemsLoading, itemsError, cacheFinancialData]);

	useEffect(() => {
		void loadData();
	}, [resolvedScenarioId, items, itemsLoading, itemsError, loadData]);

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
			if (!resolvedScenarioId) {
				console.error("scenarioId is not available");
				return;
			}

			try {
				const response = await fetch("/api/financial-entries", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						scenarioId: resolvedScenarioId,
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
		[resolvedScenarioId, loadData]
	);

	const savePeriodValue = useCallback(
		async (
			itemId: string,
			periodMonths: string[],
			value: number | null,
			options?: SavePeriodValueOptions
		): Promise<SavePeriodValueResult> => {
			if (!resolvedScenarioId) {
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

				if (value !== null && !Number.isFinite(value)) {
					throw new Error("入力値が不正です");
				}

				if (value === null) {
					const clearResponse = await fetch("/api/financial-entries", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							scenarioId: resolvedScenarioId,
							itemId,
							clearMonths: periodMonths,
						}),
					});

					if (!clearResponse.ok) {
						const error = await clearResponse.json();
						throw new Error(error.message || "Failed to clear financial entries");
					}

					await new Promise((resolve) => setTimeout(resolve, 100));
					await loadData();

					setState((current) => ({ ...current, isSaving: false }));
					return {
						ok: true,
						expandedCount: 0,
					};
				}

				let entries = isAnnualExpansionColumn
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

				// ストック項目: ユーザが編集した列の開始月より前の期間にはエントリを作成しない
				if (options?.category === "asset" || options?.category === "liability") {
					const start = options?.startMonth ?? null;
					if (start) {
						const filtered = entries.filter((e) => e.yearMonth >= start);
						// Debug: show how many entries will be saved
						console.debug("savePeriodValue: filtered stock entries", { original: entries.length, filtered: filtered.length, start });
						// use filtered entries for POST
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						(entries as any) = filtered;
					}
				}

				const response = await fetch("/api/financial-entries", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						scenarioId: resolvedScenarioId,
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
		[resolvedScenarioId, loadData]
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
