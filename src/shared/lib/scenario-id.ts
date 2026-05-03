export type ScenarioPlanLike = {
	id: string;
	type: string;
};

export const resolveActiveScenarioIdFromServer = (
	currentActiveScenarioId: string,
	plans: ScenarioPlanLike[],
	serverActiveScenarioId: string,
): string => {
	if (plans.some((plan) => plan.id === currentActiveScenarioId)) {
		return currentActiveScenarioId;
	}

	return (
		serverActiveScenarioId ||
		plans.find((plan) => plan.type === "base")?.id ||
		plans[0]?.id ||
		""
	);
};

export const resolveScenarioIdForPersist = (
	activeScenarioId: string,
	plans: ScenarioPlanLike[],
): string => {
	if (plans.some((plan) => plan.id === activeScenarioId)) {
		return activeScenarioId;
	}

	return plans.find((plan) => plan.type === "base")?.id || plans[0]?.id || "";
};
