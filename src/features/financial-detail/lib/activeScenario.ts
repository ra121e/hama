const normalizeScenarioId = (scenarioId?: string | null): string | null => {
	if (!scenarioId) {
		return null;
	}

	const trimmed = scenarioId.trim();
	return trimmed.length > 0 ? trimmed : null;
};

export const resolveFinancialDetailScenarioId = (
	explicitScenarioId?: string | null,
	activeScenarioId?: string | null,
): string => {
	return normalizeScenarioId(explicitScenarioId) ?? normalizeScenarioId(activeScenarioId) ?? "";
};
