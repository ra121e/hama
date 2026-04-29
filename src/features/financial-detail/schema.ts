import { z } from "zod";
import { financialAutoCalcSchema, financialItemCategorySchema, financialItemLevelSchema } from "./types";

export const financialItemNameSchema = z
	.string()
	.trim()
	.min(1, "項目名を入力してください")
	.max(80, "項目名は80文字以内で入力してください");

export const financialItemProfileIdSchema = z.string().min(1, "profileId は必須です");

export const createFinancialItemSchema = z.object({
	profileId: financialItemProfileIdSchema,
	parentId: z.string().min(1, "parentId は必須です"),
	name: financialItemNameSchema,
});

export const renameFinancialItemSchema = z.object({
	profileId: financialItemProfileIdSchema,
	itemId: z.string().min(1, "itemId は必須です"),
	name: financialItemNameSchema,
});

export const deleteFinancialItemSchema = z.object({
	profileId: financialItemProfileIdSchema,
	itemId: z.string().min(1, "itemId は必須です"),
});

export const reorderFinancialItemsSchema = z.object({
	profileId: financialItemProfileIdSchema,
	parentId: z.string().nullable(),
	orderedIds: z.array(z.string().min(1)).min(1, "orderedIds は少なくとも1件必要です"),
});

export const financialItemPayloadSchema = z.object({
	id: z.string().min(1),
	profileId: financialItemProfileIdSchema,
	level: financialItemLevelSchema,
	parentId: z.string().nullable(),
	name: financialItemNameSchema,
	category: financialItemCategorySchema,
	autoCalc: financialAutoCalcSchema,
	rate: z.number().nullable(),
	sortOrder: z.number().int(),
});

export const financialItemsResponseSchema = z.object({
	profileId: financialItemProfileIdSchema,
	items: z.array(financialItemPayloadSchema),
});

export type CreateFinancialItemInput = z.infer<typeof createFinancialItemSchema>;
export type RenameFinancialItemInput = z.infer<typeof renameFinancialItemSchema>;
export type DeleteFinancialItemInput = z.infer<typeof deleteFinancialItemSchema>;
export type ReorderFinancialItemsInput = z.infer<typeof reorderFinancialItemsSchema>;
export type FinancialItemsResponse = z.infer<typeof financialItemsResponseSchema>;
