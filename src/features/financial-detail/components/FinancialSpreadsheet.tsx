"use client";

import { useMemo, useCallback, useRef, useEffect } from "react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, GridReadyEvent, GridApi } from "ag-grid-community";
import { useFinancialSpreadsheet, type SpreadsheetRow } from "@/features/financial-detail/hooks/useFinancialSpreadsheet";
import { calculateSpreadsheetColumnValue } from "@/features/financial-detail/lib/spreadsheet";
import { formatCurrency } from "@/shared/lib/formatter";

ModuleRegistry.registerModules([AllCommunityModule]);

interface Props {
	scenarioId: string;
}

type RowData = {
	id: string;
	name: string;
	level: string;
	isAutoCalc: boolean;
	children: SpreadsheetRow[];
	entries: SpreadsheetRow["entries"];
	total: number;
	[key: string]: string | number | boolean | SpreadsheetRow[] | SpreadsheetRow["entries"] | null | undefined;
};

export function FinancialSpreadsheet({ scenarioId }: Props) {
	const { rows, columns, isLoading, error, savePeriodValue } = useFinancialSpreadsheet(scenarioId);

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
				const row: RowData = {
					id: item.id,
					name: item.name,
					level: item.level,
					isAutoCalc: item.isAutoCalc,
					children: item.children,
					entries: item.entries,
					total: 0,
				};

				columns.forEach((col) => {
					row[col.id] = calculateSpreadsheetColumnValue(item.entries, col);
				});

				let total = 0;
				item.entries.forEach((entry) => {
					total += entry.value;
				});
				row.total = total;

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
					const style: { [key: string]: string } = {};

					if (level === "large") {
						style.fontWeight = "bold";
						style.backgroundColor = "rgb(241, 245, 249)";
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
					cellStyle: { backgroundColor: "rgb(219, 234, 254)" },
				});
				return;
			}

			cols.push({
				field: col.id,
				headerName: col.label,
				width: col.type === "month" ? 90 : 120,
				editable: (params) => !params.data?.isAutoCalc,
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

					await savePeriodValue(row.id, col.periodMonths, newValue);

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
