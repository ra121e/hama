import type { FinancialAutoCalc, FinancialItemCategory } from "@/entities/financial-item";

export type ExpandYearlyToMonthlyInput = {
	periodMonths: string[];
	yearlyValue: number;
	category: FinancialItemCategory;
	autoCalc: FinancialAutoCalc;
	rate?: number | null;
	eventMonths?: number[];
};

export type ExpandedMonthlyValue = {
	yearMonth: string;
	value: number;
	isExpanded: boolean;
};

const roundToInteger = (value: number) => Math.round(value);

const distributeEvenly = (months: string[], yearlyValue: number) => {
	if (months.length === 0) {
		return [] as number[];
	}

	const base = Math.floor(yearlyValue / months.length);
	const remainder = roundToInteger(yearlyValue - base * months.length);

	return months.map((_, index) => base + (index < remainder ? 1 : 0));
};

const distributeToEventMonths = (months: string[], yearlyValue: number, eventMonths: number[]) => {
	if (months.length === 0) {
		return [] as number[];
	}

	const normalized = Array.from(new Set(eventMonths.filter((month) => month >= 1 && month <= 12)));
	if (normalized.length === 0) {
		return distributeEvenly(months, yearlyValue);
	}

	const valueByMonth = new Map<string, number>();
	months.forEach((yearMonth) => valueByMonth.set(yearMonth, 0));

	const amountPerEvent = Math.floor(yearlyValue / normalized.length);
	const remainder = roundToInteger(yearlyValue - amountPerEvent * normalized.length);

	normalized.forEach((monthNumber, index) => {
		const targetMonth = months.find((yearMonth) => Number(yearMonth.slice(5, 7)) === monthNumber);
		if (!targetMonth) {
			return;
		}

		valueByMonth.set(targetMonth, amountPerEvent + (index < remainder ? 1 : 0));
	});

	return months.map((yearMonth) => valueByMonth.get(yearMonth) ?? 0);
};

const expandWithAutoCalc = (months: string[], yearlyValue: number, autoCalc: FinancialAutoCalc, rate?: number | null) => {
	if (months.length === 0) {
		return [] as number[];
	}

	const yearlyRate = (rate ?? 0) / 100;
	const monthlyRate = yearlyRate / 12;

	if (autoCalc === "compound") {
		let current = yearlyValue;
		return months.map(() => {
			current = current * (1 + monthlyRate);
			return roundToInteger(current);
		});
	}

	if (autoCalc === "depreciation") {
		const monthlyDepreciation = yearlyValue * monthlyRate;
		let current = yearlyValue;
		return months.map(() => {
			current = Math.max(current - monthlyDepreciation, 0);
			return roundToInteger(current);
		});
	}

	if (autoCalc === "cashflow") {
		return distributeEvenly(months, yearlyValue);
	}

	return distributeEvenly(months, yearlyValue);
};

export const expandYearlyToMonthly = ({
	periodMonths,
	yearlyValue,
	category,
	autoCalc,
	rate,
	eventMonths,
}: ExpandYearlyToMonthlyInput): ExpandedMonthlyValue[] => {
	let monthlyValues: number[];

	if (autoCalc !== "none") {
		monthlyValues = expandWithAutoCalc(periodMonths, yearlyValue, autoCalc, rate);
	} else if (category === "expense" && eventMonths && eventMonths.length > 0) {
		monthlyValues = distributeToEventMonths(periodMonths, yearlyValue, eventMonths);
	} else {
		monthlyValues = distributeEvenly(periodMonths, yearlyValue);
	}

	return periodMonths.map((yearMonth, index) => ({
		yearMonth,
		value: monthlyValues[index] ?? 0,
		isExpanded: true,
	}));
};
