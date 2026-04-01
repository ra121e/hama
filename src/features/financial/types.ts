import type { DisplayUnit, FinancialData, FinancialItemId } from "@/entities/profile";

export type CashflowPeriod = "monthly" | "yearly";

export type CashflowPeriodState = {
	fin_income: CashflowPeriod;
	fin_expense: CashflowPeriod;
};

export type FinancialField = {
	id: FinancialItemId;
	label: string;
	description: string;
	supportsPeriodToggle: boolean;
};

export const FINANCIAL_FIELDS: FinancialField[] = [
	{
		id: "fin_assets",
		label: "総資産",
		description: "貯金・投資・不動産などの合計金額",
		supportsPeriodToggle: false,
	},
	{
		id: "fin_income",
		label: "収入",
		description: "月次/年次を切り替えて入力（内部は年次換算）",
		supportsPeriodToggle: true,
	},
	{
		id: "fin_expense",
		label: "支出",
		description: "月次/年次を切り替えて入力（内部は年次換算）",
		supportsPeriodToggle: true,
	},
];

export type FinancialWarningMap = Partial<Record<FinancialItemId, string>>;

export type FinancialFormValues = FinancialData;

export const DISPLAY_UNIT_LABEL: Record<DisplayUnit, string> = {
	yen: "円",
	man: "万円",
};
