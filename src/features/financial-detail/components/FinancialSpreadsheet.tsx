"use client";

import { useMemo, useCallback, useRef, useEffect } from "react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import type { CellStyle, ColDef, GridReadyEvent, GridApi } from "ag-grid-community";
import { useFinancialSpreadsheet, type SpreadsheetRow } from "@/features/financial-detail/hooks/useFinancialSpreadsheet";
import { calculateSpreadsheetColumnValue } from "@/features/financial-detail/lib/spreadsheet";
import { formatCurrency } from "@/shared/lib/formatter";
import { aggregateBigCategory } from "@/shared/lib/financial-aggregator";

ModuleRegistry.registerModules([AllCommunityModule]);

interface Props {
	scenarioId: string;
	onYearlyExpanded?: (expandedCount: number) => void;
	onSaveError?: (message: string) => void;
}

type RowData = {
	id: string;
	name: string;
	level: string;
	isAutoCalc: boolean;
	category: SpreadsheetRow["category"];
	autoCalc: SpreadsheetRow["autoCalc"];
	rate: SpreadsheetRow["rate"];
	children: SpreadsheetRow[];
	entries: SpreadsheetRow["entries"];
	total: number;
	[key: string]: string | number | boolean | SpreadsheetRow[] | SpreadsheetRow["entries"] | null | undefined;
};

export function FinancialSpreadsheet({ scenarioId, onYearlyExpanded, onSaveError }: Props) {
	const { rows, columns, isLoading, isSaving, error, savePeriodValue } = useFinancialSpreadsheet(scenarioId);

	const gridApiRef = useRef<GridApi | null>(null);
	const gridContainerRef = useRef<HTMLDivElement>(null);
	const scrollPositionRef = useRef<{ horizontal: number; vertical: number }>({ horizontal: 0, vertical: 0 });

	const handleGridReady = useCallback((event: GridReadyEvent) => {
		gridApiRef.current = event.api;

		if (gridContainerRef.current) {
			try {
				const viewport = gridContainerRef.current.querySelector(".ag-body-viewport") as HTMLElement | null;
				if (viewport && (scrollPositionRef.current.horizontal || scrollPositionRef.current.vertical)) {
					setTimeout(() => {
						try {
							viewport.scrollLeft = scrollPositionRef.current.horizontal;
							viewport.scrollTop = scrollPositionRef.current.vertical;
						} catch {
							// ignore
						}
					}, 50);
				}
			} catch {
				// ignore
			}
		}
	}, []);

	const preparedRowData = useMemo(() => {
		const result: RowData[] = [];

		const traverse = (items: SpreadsheetRow[]) => {
			items.forEach((item) => {
				const isStockCategory = item.category === "asset" || item.category === "liability";
				const row: RowData = {
					id: item.id,
					name: item.name,
					level: item.level,
					isAutoCalc: item.isAutoCalc,
					category: item.category,
					autoCalc: item.autoCalc,
					rate: item.rate,
					children: item.children,
					entries: item.entries,
					total: 0,
				};

				columns.forEach((col) => {
					if (isStockCategory) {
						// ストック項目の場合
						if (col.type === "fiveYear") {
							// 5年セルで入力がない場合は空白
							row[col.id] = calculateSpreadsheetColumnValue(item.entries, col, true);
						} else {
							// 月次・年次列は通常の集約
							row[col.id] = aggregateBigCategory(item.entries, item.category, col.periodMonths);
						}
					} else {
						// フロー項目の場合は従来通り
						row[col.id] = calculateSpreadsheetColumnValue(item.entries, col, false);
					}
				});

				row.total = isStockCategory
					? aggregateBigCategory(item.entries, item.category, [])
					: Array.from(item.entries.values()).reduce((sum, entry) => sum + entry.value, 0);

				result.push(row);

				if (item.children.length > 0) {
					traverse(item.children);
				}
			});
		};

		traverse(rows);
		return result;
	}, [rows, columns]);

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			try {
				if (gridContainerRef.current) {
					const viewport = gridContainerRef.current.querySelector(".ag-body-viewport") as HTMLElement | null;
					if (viewport) {
						viewport.scrollLeft = scrollPositionRef.current.horizontal;
						viewport.scrollTop = scrollPositionRef.current.vertical;
					}
				}
			} catch {
				// ignore
			}
		}, 80);

		return () => clearTimeout(timeoutId);
	}, [preparedRowData]);

	const columnDefs = useMemo<ColDef[]>(() => {
		const cols: ColDef[] = [
			{
				field: "name",
				headerName: "項目",
				width: 200,
				pinned: "left",
				cellStyle: (params) => {
					const level = params.data?.level || "";
					const category = params.data?.category || "";
					const isStockCategory = category === "asset" || category === "liability";
					const style: CellStyle = {};

					if (level === "large") {
						style.fontWeight = "bold";
						style.backgroundColor = isStockCategory ? "rgb(239, 246, 255)" : "rgb(241, 245, 249)";
						style.paddingLeft = "8px";
					} else if (level === "medium") {
						style.paddingLeft = "32px";
						style.backgroundColor = "rgb(248, 250, 252)";
					} else if (level === "small") {
						style.paddingLeft = "56px";
						style.backgroundColor = "rgb(255, 255, 255)";
					}

					return style;
				},
				tooltipField: undefined,
				tooltipValueGetter: (params) => {
					const level = params.data?.level || "";
					const category = params.data?.category || "";
					const isStockCategory = category === "asset" || category === "liability";
					if (level === "large") {
						return isStockCategory ? "残高合計（自動計算）" : "中項目の合計（自動計算）";
					}
					return "";
				},
			},
		];

		columns.forEach((col) => {
			if (col.type === "total") {
				cols.push({
					field: col.id,
					headerName: col.label,
					width: 120,
					editable: false,
					valueFormatter: (params) => {
						const value = params.value;
						if (value === null || value === undefined || value === 0) return "";
						return formatCurrency(value);
					},
					cellStyle: (params) => {
						const level = params.data?.level || "";
						const category = params.data?.category || "";
						const isStockCategory = category === "asset" || category === "liability";
						if (level === "large") {
							return { backgroundColor: isStockCategory ? "rgb(239, 246, 255)" : "rgb(241, 245, 249)" };
						}
						return { backgroundColor: "rgb(219, 234, 254)" };
					},
					tooltipValueGetter: (params) => {
						const level = params.data?.level || "";
						const category = params.data?.category || "";
						const isStockCategory = category === "asset" || category === "liability";
						if (level === "large") {
							return isStockCategory ? "残高合計（自動計算）" : "中項目の合計（自動計算）";
						}
						return "";
					},
				});
				return;
			}

			cols.push({
				field: col.id,
				headerName: col.label,
				width: col.type === "month" ? 90 : 120,
				editable: (params) => {
					// 大項目（level === 'large'）は常に編集不可
					if (params.data?.level === "large") {
						return false;
					}
					// 自動計算セルも編集不可
					return !params.data?.isAutoCalc;
				},
				cellEditor: "agNumberCellEditor",
				cellEditorParams: {
					min: 0,
					precision: 0,
				},
				valueFormatter: (params) => {
					const value = params.value;
					if (value === null || value === undefined || value === 0) return "";
					return formatCurrency(value);
				},
				cellStyle: (params): CellStyle | undefined => {
					const baseStyle: CellStyle = col.type === "fiveYear"
						? { backgroundColor: "rgb(255, 247, 237)", fontWeight: "600" }
						: {};
					const level = params.data?.level || "";
					const category = params.data?.category || "";
					const isStockCategory = category === "asset" || category === "liability";
					if (level === "large") {
						return {
							...baseStyle,
							backgroundColor: isStockCategory ? "rgb(239, 246, 255)" : "rgb(241, 245, 249)",
						};
					}
					return Object.keys(baseStyle).length > 0 ? baseStyle : undefined;
				},
				headerClass: col.type === "fiveYear" ? "five-year-column-header" : undefined,
				tooltipValueGetter: (params) => {
					const level = params.data?.level || "";
					if (level === "large") {
						return "中項目の合計（自動計算）";
					}
					return "";
				},
				onCellValueChanged: async (event) => {
					const row = event.data as RowData;
					const newValue = Number(event.newValue) || 0;

					if (!row.id) return;

					if (gridContainerRef.current) {
						try {
							const viewport = gridContainerRef.current.querySelector(".ag-body-viewport") as HTMLElement | null;
							if (viewport) {
								scrollPositionRef.current = {
									horizontal: viewport.scrollLeft,
									vertical: viewport.scrollTop,
								};
							}
						} catch {
							// ignore
						}
					}

					const result = await savePeriodValue(row.id, col.periodMonths, newValue, {
						columnType: col.type,
						category: row.category,
						autoCalc: row.autoCalc,
						rate: row.rate,
					});

					if (!result.ok && result.error && onSaveError) {
						onSaveError(result.error);
					}

					if (result.ok && result.expandedCount > 0 && onYearlyExpanded) {
						onYearlyExpanded(result.expandedCount);
					}

					setTimeout(() => {
						try {
							if (gridContainerRef.current) {
								const viewport = gridContainerRef.current.querySelector(".ag-body-viewport") as HTMLElement | null;
								if (viewport) {
									viewport.scrollLeft = scrollPositionRef.current.horizontal;
									viewport.scrollTop = scrollPositionRef.current.vertical;
								}
							}
						} catch {
							// ignore
						}
					}, 0);
				},
				cellClass: (params) => (params.data?.isAutoCalc ? "ag-cell-readonly" : ""),
			});
		});

		return cols;
	}, [columns, savePeriodValue]);

	if (isLoading && preparedRowData.length === 0) {
		return (
			<div className="flex justify-center items-center py-12 h-96">
				<p className="text-muted-foreground">データを読み込み中...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-4 m-4">
				<p className="text-sm font-medium text-red-700 dark:text-red-200">エラー: {error}</p>
				<p className="text-xs text-red-600 dark:text-red-300 mt-1">ブラウザのコンソールで詳細なエラーログを確認してください。</p>
			</div>
		);
	}

	if (preparedRowData.length === 0) {
		return (
			<div className="rounded-lg border border-border bg-muted/20 p-8 text-center text-muted-foreground h-96 flex items-center justify-center">
				<div>
					<p className="text-sm">財務項目がまだ作成されていません。</p>
					<p className="text-xs mt-2">左側の「財務項目」パネルで、まず大項目（収入、支出、資産、負債）の下に中項目を追加してください。</p>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full" style={{ "--ag-font-size": "13px" } as React.CSSProperties} ref={gridContainerRef}>
			{isSaving && (
				<div className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
					保存中...
				</div>
			)}
			<div className="ag-theme-quartz w-full">
				<AgGridReact
					columnDefs={columnDefs}
					rowData={preparedRowData}
					onGridReady={handleGridReady}
					domLayout="autoHeight"
					rowHeight={36}
					defaultColDef={{
						resizable: true,
						sortable: false,
						filter: false,
					}}
				/>
			</div>
		</div>
	);
}
