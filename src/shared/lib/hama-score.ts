import type { Profile } from "@/entities/profile";

export type FinancialData = {
	assets: number;
	income: number;
	expense: number;
};

export type HappinessData = {
	hap_time: number;
	hap_health: number;
	hap_relation: number;
	hap_selfreal: number;
};

export type Settings = {
	weightHappiness: number;
	weightFinance: number;
	targetAssets: number | null;
};

export type SnapshotData = {
	financial: FinancialData;
	happiness: HappinessData;
};

/**
 * 財務健全性指数（0〜100にキャッピング）
 * = 収支バランス比率 と 資産達成率 の平均
 */
export function calcFinanceScore(financial: FinancialData, settings: Settings): number {
	const cashflowRatio =
		Math.max(0, (financial.income - financial.expense) / financial.income) * 100;
	const assetRatio =
		settings.targetAssets && settings.targetAssets > 0
			? Math.min(100, (financial.assets / settings.targetAssets) * 100)
			: 50;
	return (cashflowRatio + assetRatio) / 2;
}

/**
 * ハッピースコア（項目の単純平均）
 */
export function calcHappinessScore(happiness: HappinessData): number {
	const values = Object.values(happiness);
	return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * HAMAスコア（総合）
 */
export function calcHamaScore(data: SnapshotData, settings: Settings): number {
	const finScore = calcFinanceScore(data.financial, settings);
	const hapScore = calcHappinessScore(data.happiness);
	return hapScore * settings.weightHappiness + finScore * settings.weightFinance;
}

export function calcHamaScoreFromProfile(profile: Profile): number {
	return calcHamaScore(
		{
			financial: {
				assets: profile.financial.fin_assets,
				income: profile.financial.fin_income,
				expense: profile.financial.fin_expense,
			},
			happiness: profile.happiness,
		},
		{
			weightHappiness: profile.settings.weightHappiness,
			weightFinance: profile.settings.weightFinance,
			targetAssets: profile.settings.targetAssets,
		},
	);
}
