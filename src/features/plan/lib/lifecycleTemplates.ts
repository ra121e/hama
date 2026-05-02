import { z } from "zod";

export const LIFECYCLE_TEMPLATE_IDS = ["twenties", "thirties", "forties", "fifties"] as const;

export type LifecycleTemplateId = (typeof LIFECYCLE_TEMPLATE_IDS)[number];

const financialSchema = z.object({
	fin_assets: z.number().finite(),
	fin_income: z.number().finite(),
	fin_expense: z.number().finite(),
});

const happinessSchema = z.object({
	hap_time: z.number().int().min(0).max(100),
	hap_health: z.number().int().min(0).max(100),
	hap_relation: z.number().int().min(0).max(100),
	hap_selfreal: z.number().int().min(0).max(100),
});

// 詳細財務入力用スキーマ
const financialDetailItemSchema = z.object({
	id: z.string().min(1),
	level: z.enum(["large", "medium", "small"]),
	parentId: z.string().nullable(),
	name: z.string().min(1),
	category: z.enum(["income", "expense", "asset", "liability"]),
	autoCalc: z.enum(["none", "compound", "depreciation", "cashflow"]).default("none"),
	rate: z.number().nullable().default(null),
});

const financialDetailEntrySchema = z.object({
	itemId: z.string().min(1),
	yearMonth: z.string(), // "2026-04" format
	value: z.number(),
});

const financialDetailSchema = z.object({
	items: z.array(financialDetailItemSchema),
	entries: z.array(financialDetailEntrySchema),
}).optional();

export const lifecycleTemplateSchema = z.object({
	id: z.enum(LIFECYCLE_TEMPLATE_IDS),
	title: z.string().min(1),
	description: z.string().min(1),
	timepoint: z.literal("now"),
	financial: financialSchema,
	happiness: happinessSchema,
	financialDetail: financialDetailSchema,
});

export type LifecycleTemplate = z.infer<typeof lifecycleTemplateSchema>;
export type LifecycleTemplateFinancialDetailItem = z.infer<typeof financialDetailItemSchema>;
export type LifecycleTemplateFinancialDetailEntry = z.infer<typeof financialDetailEntrySchema>;

const LIFECYCLE_TEMPLATE_PATHS: Record<LifecycleTemplateId, string> = {
	twenties: "/templates/twenties.json",
	thirties: "/templates/thirties.json",
	forties: "/templates/forties.json",
	fifties: "/templates/fifties.json",
};

export const loadLifecycleTemplates = async (): Promise<LifecycleTemplate[]> => {
	const templates = await Promise.all(
		LIFECYCLE_TEMPLATE_IDS.map(async (id) => {
			const response = await fetch(LIFECYCLE_TEMPLATE_PATHS[id], { cache: "no-store" });
			if (!response.ok) {
				throw new Error(`Failed to load template: ${id}`);
			}

			const payload = (await response.json()) as unknown;
			return lifecycleTemplateSchema.parse(payload);
		}),
	);

	return templates;
};
