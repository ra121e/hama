import type { FinancialAutoCalc, FinancialItemCategory } from "@/entities/financial-item";

export type ExpandYearlyToMonthlyInput = {
	periodMonths: string[];
	yearlyValue: number;
	years?: number;
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

const normalizeYears = (years?: number) => {
	if (!years || !Number.isFinite(years) || years < 1) {
		return 1;
	}

	return Math.floor(years);
};

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

const expandBaseYearPattern = (
	yearlyValue: number,
	category: FinancialItemCategory,
	autoCalc: FinancialAutoCalc,
	rate?: number | null,
	eventMonths?: number[],
) => {
	const baseMonths = Array.from({ length: 12 }, (_, index) => `base-${String(index + 1).padStart(2, "0")}`);

	if (autoCalc !== "none") {
		return expandWithAutoCalc(baseMonths, yearlyValue, autoCalc, rate);
	}

	if (category === "expense" && eventMonths && eventMonths.length > 0) {
		return distributeToEventMonths(baseMonths, yearlyValue, eventMonths);
	}

	return distributeEvenly(baseMonths, yearlyValue);
};

const repeatAnnualPattern = (months: string[], annualPattern: number[]) => {
	if (annualPattern.length !== 12 || months.length % 12 !== 0) {
		return months.map(() => 0);
	}

	return months.map((_, index) => annualPattern[index % 12] ?? 0);
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
	years,
	category,
	autoCalc,
	rate,
	eventMonths,
}: ExpandYearlyToMonthlyInput): ExpandedMonthlyValue[] => {
	const normalizedYears = normalizeYears(years);
	const expectedMonths = normalizedYears * 12;

	if (periodMonths.length !== expectedMonths) {
		throw new Error(`periodMonths must contain ${expectedMonths} months for ${normalizedYears} year expansion`);
	}

	let monthlyValues: number[];
	const annualPattern = expandBaseYearPattern(yearlyValue, category, autoCalc, rate, eventMonths);

	if (normalizedYears === 1) {
		monthlyValues = annualPattern;
	} else {
		monthlyValues = repeatAnnualPattern(periodMonths, annualPattern);
	}

	return periodMonths.map((yearMonth, index) => ({
		yearMonth,
		value: monthlyValues[index] ?? 0,
		isExpanded: true,
	}));
};
