import type { FinancialEntry } from "@/entities/financial-item";

export type SpreadsheetColumn = {
	id: string;
	label: string;
	yearMonth: string | null;
	periodMonths: string[];
	type: "month" | "year" | "fiveYear" | "total" | "average";
};

const buildPeriodMonths = (startDate: Date, count: number) => {
	return Array.from({ length: count }, (_, index) => {
		const date = new Date(startDate.getFullYear(), startDate.getMonth() + index, 1);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		return `${year}-${month}`;
	});
};

const createTotalColumn = (id: string, periodMonths: string[], label = "合計"): SpreadsheetColumn => {
	return {
		id,
		label,
		yearMonth: null,
		periodMonths,
		type: "total",
	};
};

export const generateSpreadsheetColumns = (baseDate = new Date()): SpreadsheetColumn[] => {
	const columns: SpreadsheetColumn[] = [];

	// 直近36ヶ月
	for (let i = 0; i < 36; i++) {
		const date = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const yearMonth = `${year}-${month}`;

		columns.push({
			id: `month_${yearMonth}`,
			label: month,
			yearMonth,
			periodMonths: [yearMonth],
			type: "month",
		});

		if ((i + 1) % 12 === 0) {
			const blockMonths = columns
				.slice(columns.length - 12)
				.map((column) => column.yearMonth)
				.filter((yearMonth): yearMonth is string => yearMonth !== null);
			const blockIndex = Math.floor(i / 12) + 1;
			columns.push(createTotalColumn(`total_month_block_${blockIndex}`, blockMonths));
		}
	}

	// 37ヶ月以降は年次列
	for (let i = 0; i < 7; i++) {
		const periodStart = new Date(baseDate.getFullYear(), baseDate.getMonth() + 36 + i * 12, 1);
		const periodMonths = buildPeriodMonths(periodStart, 12);
		const year = periodStart.getFullYear();
		columns.push({
			id: `year_${year}`,
			label: `${year}`,
			yearMonth: null,
			periodMonths,
			type: "year",
		});
	}

	// 11年目以降は5年ごとの列
	for (let i = 0; i < 4; i++) {
		const periodStart = new Date(baseDate.getFullYear(), baseDate.getMonth() + 120 + i * 60, 1);
		const periodMonths = buildPeriodMonths(periodStart, 60);
		const startYear = periodStart.getFullYear();
		const endYear = startYear + 4;

		columns.push({
			id: `five_year_${startYear}`,
			label: `5年単位（年額） ${startYear}-${endYear}`,
			yearMonth: null,
			periodMonths,
			type: "fiveYear",
		});
	}

	columns.push(createTotalColumn("total", [], "総合計"));

	return columns;
};

export const calculateSpreadsheetColumnValue = (
	entries: Map<string, FinancialEntry>,
	column: Pick<SpreadsheetColumn, "id" | "periodMonths" | "type">
) => {
	if (column.id === "total") {
		let total = 0;
		entries.forEach((entry) => {
			total += entry.value;
		});
		return total;
	}

	if (column.type === "total") {
		return column.periodMonths.reduce((sum, yearMonth) => {
			return sum + (entries.get(yearMonth)?.value ?? 0);
		}, 0);
	}

	if (column.periodMonths.length === 0) {
		return 0;
	}

	if (column.periodMonths.length === 1) {
		return entries.get(column.periodMonths[0])?.value ?? 0;
	}

	const total = column.periodMonths.reduce((sum, yearMonth) => {
		return sum + (entries.get(yearMonth)?.value ?? 0);
	}, 0);

	return total / column.periodMonths.length;
};
