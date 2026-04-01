import type { HappinessData, HappinessItemId } from "@/entities/profile";

export type HappinessField = {
	id: HappinessItemId;
	label: string;
	description: string;
	memoPlaceholder: string;
};

export const HAPPINESS_FIELDS: HappinessField[] = [
	{
		id: "hap_time",
		label: "時間バランス",
		description: "仕事・プライベートの時間配分への満足度",
		memoPlaceholder: "時間の使い方で満足している点や改善したい点をメモ",
	},
	{
		id: "hap_health",
		label: "健康",
		description: "身体的・精神的健康の自己評価",
		memoPlaceholder: "体調やメンタル面の状態をメモ",
	},
	{
		id: "hap_relation",
		label: "人間関係",
		description: "家族・友人・パートナーとの関係満足度",
		memoPlaceholder: "人間関係で感じている充実度をメモ",
	},
	{
		id: "hap_selfreal",
		label: "自己実現",
		description: "やりたいことへの取り組み度・達成感",
		memoPlaceholder: "自己実現に関する進捗や課題をメモ",
	},
];

export type HappinessFormValues = HappinessData;
