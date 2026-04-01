import type {
	FinancialData,
	HappinessData,
	Profile,
	ProfileSettings,
} from "@/entities/profile";

const clampScore = (value: number) => Math.max(0, Math.min(100, value));

export function calcFinanceScore(
	financial: FinancialData,
	settings: ProfileSettings,
): number {
	const income = financial.fin_income;
	const expense = financial.fin_expense;
	const assets = financial.fin_assets;

	const cashflowRatio =
		income > 0 ? ((income - expense) / income) * 100 : 0;

	const assetRatio =
		settings.targetAssets && settings.targetAssets > 0
			? (assets / settings.targetAssets) * 100
			: 50;

	return (clampScore(cashflowRatio) + clampScore(assetRatio)) / 2;
}

export function calcHappinessScore(happiness: HappinessData): number {
	const values = Object.values(happiness);
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function calcHamaScore(
	financial: FinancialData,
	happiness: HappinessData,
	settings: ProfileSettings,
): number {
	const financeScore = calcFinanceScore(financial, settings);
	const happinessScore = calcHappinessScore(happiness);
	const totalWeight = settings.weightHappiness + settings.weightFinance;

	if (totalWeight <= 0) {
		return happinessScore;
	}

	const normalizedHappinessWeight = settings.weightHappiness / totalWeight;
	const normalizedFinanceWeight = settings.weightFinance / totalWeight;

	return (
		happinessScore * normalizedHappinessWeight +
		financeScore * normalizedFinanceWeight
	);
}

export function calcHamaScoreFromProfile(profile: Profile): number {
	return calcHamaScore(profile.financial, profile.happiness, profile.settings);
}
