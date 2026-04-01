import { z } from "zod";

export const happinessScoreSchema = z
	.number()
	.int("整数で入力してください")
	.min(0, "0以上で入力してください")
	.max(100, "100以下で入力してください");

export const happinessFormSchema = z.object({
	hap_time: happinessScoreSchema,
	hap_health: happinessScoreSchema,
	hap_relation: happinessScoreSchema,
	hap_selfreal: happinessScoreSchema,
});

export const happinessMemoSchema = z
	.string()
	.max(200, "メモは200文字以内で入力してください")
	.optional();

export type HappinessFormSchema = z.infer<typeof happinessFormSchema>;
