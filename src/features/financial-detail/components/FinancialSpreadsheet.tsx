"use client";

import { useMemo, useCallback, useRef } from "react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, GridReadyEvent, GridApi } from "ag-grid-community";
import { useFinancialSpreadsheet, type SpreadsheetRow } from "@/features/financial-detail/hooks/useFinancialSpreadsheet";
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
const { rows, columns, isLoading, error, savePeriodValue } =
useFinancialSpreadsheet(scenarioId);

const gridApiRef = useRef<GridApi | null>(null);

const handleGridReady = useCallback((event: GridReadyEvent) => {
	gridApiRef.current = event.api;

	// Auto-size all columns to fit content initially (allow horizontal scrollbar)
	event.api.autoSizeColumns([], false);
}, []);

// Flatten hierarchical rows and prepare data for ag-Grid
const preparedRowData = useMemo(() => {
const result: RowData[] = [];

const getColumnValue = (entries: SpreadsheetRow["entries"], periodMonths: string[]) => {
if (periodMonths.length === 0) {
return 0;
}

if (periodMonths.length === 1) {
return entries.get(periodMonths[0])?.value ?? 0;
}

const total = periodMonths.reduce((sum, yearMonth) => {
return sum + (entries.get(yearMonth)?.value ?? 0);
}, 0);

return total / periodMonths.length;
};

const traverse = (items: SpreadsheetRow[]) => {
items.forEach((item) => {
// Prepare row with all monthly/yearly data
const row: RowData = {
id: item.id,
name: item.name,
level: item.level,
isAutoCalc: item.isAutoCalc,
children: item.children,
entries: item.entries,
total: 0, // Initialize, will be calculated below
};

// Add entry data for each column
columns.forEach((col) => {
if (col.type !== "total") {
row[col.id] = getColumnValue(item.entries, col.periodMonths);
}
});

// Calculate total from all entries
let total = 0;
item.entries?.forEach((entry) => {
total += entry.value;
});
row.total = total;

// Add row to result
result.push(row);

// Recursively traverse children
if (item.children && item.children.length > 0) {
traverse(item.children);
}
});
};

traverse(rows);
return result;
}, [rows, columns]);

// Build column definitions for ag-Grid
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

// Add period columns
columns.forEach((col) => {
if (col.type !== "total") {
cols.push({
field: col.id,
headerName: col.label,
width: col.type === "month" ? 90 : 120,
editable: (params) => {
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
onCellValueChanged: async (event) => {
const row = event.data as RowData;
const newValue = Number(event.newValue) || 0;

if (!row.id) return;

await savePeriodValue(row.id, col.periodMonths, newValue);
// After updating data, auto-size this column to fit new content
try {
	const colId = col.id;
	gridApiRef.current?.autoSizeColumns([colId], false);
	} catch {
	// ignore
}
},
cellClass: (params) => {
return params.data?.isAutoCalc ? "ag-cell-readonly" : "";
},
});
}
});

// Add total column
cols.push({
field: "total",
headerName: "合計",
width: 120,
editable: false,
valueFormatter: (params) => {
const value = params.value;
if (value === null || value === undefined || value === 0) return "";
return formatCurrency(value);
},
cellStyle: { backgroundColor: "rgb(219, 234, 254)" },
});

return cols;
}, [columns, savePeriodValue]);

if (isLoading) {
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
<p className="text-xs text-red-600 dark:text-red-300 mt-1">
ブラウザのコンソールで詳細なエラーログを確認してください。
</p>
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
	<div className="w-full" style={{ "--ag-font-size": "13px" } as React.CSSProperties}>
		<div className="ag-theme-quartz w-full">
			<AgGridReact
				domLayout="autoHeight"
				columnDefs={columnDefs}
				rowData={preparedRowData}
				onGridReady={handleGridReady}
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
