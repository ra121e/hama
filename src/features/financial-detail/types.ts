import type { FinancialAutoCalc, FinancialItem, FinancialItemCategory, FinancialItemLevel } from "@/entities/financial-item";
import { z } from "zod";

export type { FinancialAutoCalc, FinancialItem, FinancialItemCategory, FinancialItemLevel };

export type FinancialItemNode = FinancialItem & {
	children: FinancialItemNode[];
};

export type FinancialItemTree = FinancialItemNode[];

export const financialItemLevelSchema = z.enum(["large", "medium", "small"]);
export const financialItemCategorySchema = z.enum(["income", "expense", "asset", "liability"]);
export const financialAutoCalcSchema = z.enum(["none", "compound", "depreciation", "cashflow"]);

export const financialItemSchema = z.object({
	id: z.string().min(1),
	profileId: z.string().min(1),
	scenarioId: z.string().min(1),
	level: financialItemLevelSchema,
	parentId: z.string().nullable(),
	name: z.string().min(1),
	category: financialItemCategorySchema,
	autoCalc: financialAutoCalcSchema,
	rate: z.number().nullable(),
	sortOrder: z.number().int(),
});

export type FinancialItemDto = z.infer<typeof financialItemSchema>;

export const financialItemNodeArraySchema: z.ZodType<FinancialItemNode[]> = z.lazy(() =>
	z.array(
		financialItemSchema.extend({
			children: financialItemNodeArraySchema,
		}),
	),
);

export const financialItemNodeSchema: z.ZodType<FinancialItemNode> = financialItemSchema.extend({
	children: financialItemNodeArraySchema,
});

export const fixedRootFinancialItemSchema = z.object({
	category: financialItemCategorySchema,
	label: z.string().min(1),
});

export type FixedRootFinancialItem = z.infer<typeof fixedRootFinancialItemSchema>;export type {};
