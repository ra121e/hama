import type { Profile } from "@/entities/profile";
import type { FinancialData } from "@/shared/lib/financial-aggregator";

export type FinancialSnapshotData = {
	fin_assets: number;
	fin_income: number;
	fin_expense: number;
};

export type FinancialDataInput = FinancialData | FinancialSnapshotData | null | undefined;

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
	financial: FinancialDataInput;
	happiness: HappinessData;
};

const safeNumber = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);

const normalizeFinancialData = (financial: FinancialDataInput): FinancialData => {
	if (!financial) {
		return {
			assets: 0,
			income: 0,
			expense: 0,
		};
	}

	if ("assets" in financial && "income" in financial && "expense" in financial) {
		return {
			assets: safeNumber(financial.assets),
			income: safeNumber(financial.income),
			expense: safeNumber(financial.expense),
		};
	}

	if ("fin_assets" in financial && "fin_income" in financial && "fin_expense" in financial) {
		return {
			assets: safeNumber(financial.fin_assets),
			income: safeNumber(financial.fin_income),
			expense: safeNumber(financial.fin_expense),
		};
	}

	return {
		assets: 0,
		income: 0,
		expense: 0,
	};
};

const normalizeSettings = (settings: Settings): Settings => ({
	weightHappiness: safeNumber(settings.weightHappiness),
	weightFinance: safeNumber(settings.weightFinance),
	targetAssets: (() => {
		const targetAssets = safeNumber(settings.targetAssets);
		return targetAssets > 0 ? targetAssets : null;
	})(),
});

/**
 * 財務健全性指数（0〜100にキャッピング）
 * = 収支バランス比率 と 資産達成率 の平均
 */
export function calcFinanceScore(financial: FinancialDataInput, settings: Settings): number {
	const normalizedFinancial = normalizeFinancialData(financial);
	const normalizedSettings = normalizeSettings(settings);
	const cashflowRatio =
		normalizedFinancial.income > 0
			? Math.max(0, (normalizedFinancial.income - normalizedFinancial.expense) / normalizedFinancial.income) * 100
			: normalizedFinancial.expense <= 0
				? 100
				: 0;
	const assetRatio =
		normalizedSettings.targetAssets && normalizedSettings.targetAssets > 0
			? Math.min(100, (normalizedFinancial.assets / normalizedSettings.targetAssets) * 100)
			: 50;
	return (cashflowRatio + assetRatio) / 2;
}

/**
 * ハッピースコア（項目の単純平均）
 */
export function calcHappinessScore(happiness: HappinessData): number {
	const values = Object.values(happiness).map((value) => safeNumber(value));
	if (values.length === 0) {
		return 0;
	}
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * HAMAスコア（総合）
 */
export function calcHamaScore(data: SnapshotData, settings: Settings): number {
	const normalizedSettings = normalizeSettings(settings);
	const finScore = calcFinanceScore(data.financial, normalizedSettings);
	const hapScore = calcHappinessScore(data.happiness);
	return Math.max(0, Math.min(100, hapScore * normalizedSettings.weightHappiness + finScore * normalizedSettings.weightFinance));
}

export function calcHamaScoreFromProfile(profile: Profile, financialData?: FinancialDataInput): number {
	return calcHamaScore(
		{
			financial: financialData ?? {
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
