import { z } from "zod";

export const financialAmountSchema = z
	.number({ error: "数値を入力してください" })
	.finite("有効な数値を入力してください");

export const financialFormSchema = z.object({
	fin_assets: financialAmountSchema,
	fin_income: financialAmountSchema,
	fin_expense: financialAmountSchema,
});

export const financialWarningSchema = z.object({
	fin_assets: financialAmountSchema.min(0, "負の値は警告対象です"),
	fin_income: financialAmountSchema.min(0, "負の値は警告対象です"),
	fin_expense: financialAmountSchema.min(0, "負の値は警告対象です"),
});

export type FinancialFormSchema = z.infer<typeof financialFormSchema>;
