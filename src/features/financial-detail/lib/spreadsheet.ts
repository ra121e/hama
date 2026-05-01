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
			label: `${year}（年額）`,
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
			label: `5年単位 ${startYear}-${endYear}（年額）`,
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
	column: Pick<SpreadsheetColumn, "id" | "periodMonths" | "type"> & { isStockCategory?: boolean },
	isStockCategory?: boolean
): number | null => {
	const sumPeriodValues = () => {
		return column.periodMonths.reduce((sum, yearMonth) => {
			return sum + (entries.get(yearMonth)?.value ?? 0);
		}, 0);
	};

	const getLatestPeriodValue = () => {
		for (let index = column.periodMonths.length - 1; index >= 0; index -= 1) {
			const value = entries.get(column.periodMonths[index])?.value;
			if (typeof value === "number" && Number.isFinite(value)) {
				return value;
			}
		}

		return 0;
	};

	if (column.id === "total") {
		let total = 0;
		entries.forEach((entry) => {
			total += entry.value;
		});
		return total;
	}

	if (column.type === "total") {
		return sumPeriodValues();
	}

	if (column.periodMonths.length === 0) {
		return 0;
	}

	if (column.periodMonths.length === 1) {
		return entries.get(column.periodMonths[0])?.value ?? 0;
	}

	if (column.type === "year") {
		if (isStockCategory) {
			return getLatestPeriodValue();
		}
		// 年次列はその年の合計（年額）を表示
		return sumPeriodValues();
	}

	if (column.type === "fiveYear") {
		if (isStockCategory) {
			return getLatestPeriodValue();
		}
		// フロー項目の5年列は表示上は年額（5年合計を年数で割る）を返す
		const years = column.periodMonths.length / 12 || 1;
		return sumPeriodValues() / years;
	}

	// ストック項目の5年セルで入力がない場合は null を返す
	if (isStockCategory && column.type === "fiveYear") {
		const hasAnyEntry = column.periodMonths.some((yearMonth) => entries.has(yearMonth));
		if (!hasAnyEntry) {
			return null; // 入力がないので空白のまま
		}
	}

	return sumPeriodValues() / column.periodMonths.length;
};
