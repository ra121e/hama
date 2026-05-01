import { create } from "zustand";
import {
	createInitialProfile,
	type DisplayUnit,
	type FinancialItemId,
	type HappinessItemId,
	type ItemId,
	type Profile,
	type ProfileSettings,
	type Timepoint,
} from "@/entities/profile";
import { calcHamaScoreFromProfile } from "@/shared/lib/hama-score";
import type { FinancialData, FinancialDataByTimepoint } from "@/shared/lib/financial-aggregator";
import type { Snapshot } from "@/entities/scenario";
import type { PlanSummary } from "@/features/plan/types";
import type { LifecycleTemplate } from "@/features/plan/lib/lifecycleTemplates";

type ScenarioSnapshotState = Partial<Record<Timepoint, Snapshot[]>>;
type ScenarioFinancialState = Partial<Record<Timepoint, FinancialData>>;

type ServerPayload = {
	profile: {
		id: string;
		name: string;
		currency: string;
		userId: string | null;
		createdAt: string;
		updatedAt: string;
		financial: Profile["financial"];
		happiness: Profile["happiness"];
		happinessMemo: Profile["happinessMemo"];
		settings: {
			weightHappiness: number;
			weightFinance: number;
			targetAssets: number | null;
			displayUnit: string;
			currency: string;
		};
	};
	activeScenarioId: string;
	snapshotsByScenario: Record<string, Record<string, Snapshot[]>>;
	plans?: PlanSummary[];
	scenarios?: PlanSummary[];
};

type ProfileStoreState = {
	profile: Profile;
	hamaScore: number;
	activeScenarioId: string;
	activeTimepoint: Timepoint;
	plans: PlanSummary[];
	snapshotsByScenario: Record<string, ScenarioSnapshotState>;
	financialDataByScenario: Record<string, ScenarioFinancialState>;
	isHydrated: boolean;
	isLoading: boolean;
	isSaving: boolean;
	lastSavedAt: string | null;
	errorMessage: string | null;
	setActiveScenario: (scenarioId: string) => void;
	setActivePlan: (planId: string) => void;
	setActiveTimepoint: (timepoint: Timepoint) => void;
	applyTemplate: (template: LifecycleTemplate) => void;
	createPlan: (name: string) => Promise<void>;
	renamePlan: (planId: string, name: string) => Promise<void>;
	deletePlan: (planId: string) => Promise<void>;
	setProfileMeta: (patch: Partial<Pick<Profile, "id" | "name" | "userId">>) => void;
	updateFinancial: (itemId: FinancialItemId, value: number) => void;
	updateHappiness: (itemId: HappinessItemId, value: number, memo?: string) => void;
	updateSettings: (patch: Partial<ProfileSettings>) => void;
	setSnapshots: (scenarioId: string, timepoint: Timepoint, snapshots: Snapshot[]) => void;
	cacheFinancialData: (scenarioId: string, data: FinancialDataByTimepoint | null) => void;
	syncCurrentInputsToSnapshot: (scenarioId: string, timepoint: Timepoint) => void;
	recalculateHamaScore: () => void;
	loadProfileFromDb: () => Promise<void>;
	persistProfileToDb: () => Promise<void>;
	clearError: () => void;
	resetProfile: () => void;
};

const TIMEPOINTS: Timepoint[] = ["now", "5y", "10y", "20y"];
const FINANCIAL_ITEM_IDS: FinancialItemId[] = ["fin_assets", "fin_income", "fin_expense"];
const HAPPINESS_ITEM_IDS: HappinessItemId[] = ["hap_time", "hap_health", "hap_relation", "hap_selfreal"];

const createSnapshotId = (scenarioId: string, timepoint: Timepoint, itemId: ItemId) =>
	`${scenarioId}:${timepoint}:${itemId}`;

const createSnapshotsFromProfile = (
	profile: Profile,
	scenarioId: string,
	timepoint: Timepoint,
): Snapshot[] => {
	const financialSnapshots: Snapshot[] = [
		{
			id: createSnapshotId(scenarioId, timepoint, "fin_assets"),
			scenarioId,
			timepoint,
			categoryId: "financial",
			itemId: "fin_assets",
			value: profile.financial.fin_assets,
		},
		{
			id: createSnapshotId(scenarioId, timepoint, "fin_income"),
			scenarioId,
			timepoint,
			categoryId: "financial",
			itemId: "fin_income",
			value: profile.financial.fin_income,
		},
		{
			id: createSnapshotId(scenarioId, timepoint, "fin_expense"),
			scenarioId,
			timepoint,
			categoryId: "financial",
			itemId: "fin_expense",
			value: profile.financial.fin_expense,
		},
	];

	const happinessItems: HappinessItemId[] = [
		"hap_time",
		"hap_health",
		"hap_relation",
		"hap_selfreal",
	];

	const happinessSnapshots = happinessItems.map((itemId) => ({
		id: createSnapshotId(scenarioId, timepoint, itemId),
		scenarioId,
		timepoint,
		categoryId: "happiness" as const,
		itemId,
		value: profile.happiness[itemId],
		memo: profile.happinessMemo[itemId],
	}));

	return [...financialSnapshots, ...happinessSnapshots];
};

const applySnapshotsToProfile = (profile: Profile, snapshots?: Snapshot[]): Profile => {
	if (!snapshots || snapshots.length === 0) {
		return profile;
	}

	const nextFinancial = { ...profile.financial };
	const nextHappiness = { ...profile.happiness };
	const nextHappinessMemo = { ...profile.happinessMemo };

	for (const snapshot of snapshots) {
		if (snapshot.categoryId === "financial" && FINANCIAL_ITEM_IDS.includes(snapshot.itemId as FinancialItemId)) {
			nextFinancial[snapshot.itemId as FinancialItemId] = snapshot.value;
		}

		if (snapshot.categoryId === "happiness" && HAPPINESS_ITEM_IDS.includes(snapshot.itemId as HappinessItemId)) {
			const itemId = snapshot.itemId as HappinessItemId;
			nextHappiness[itemId] = snapshot.value;
			if (snapshot.memo !== undefined) {
				nextHappinessMemo[itemId] = snapshot.memo;
			}
		}
	}

	return {
		...profile,
		financial: nextFinancial,
		happiness: nextHappiness,
		happinessMemo: nextHappinessMemo,
	};
};

const resolveProfileForSelection = (
	profile: Profile,
	snapshotsByScenario: Record<string, ScenarioSnapshotState>,
	scenarioId: string,
	timepoint: Timepoint,
): Profile => {
	const scenarioSnapshots = snapshotsByScenario[scenarioId] ?? {};
	const targetSnapshots = scenarioSnapshots[timepoint];

	if (targetSnapshots && targetSnapshots.length > 0) {
		return applySnapshotsToProfile(profile, targetSnapshots);
	}

	const nowSnapshots = scenarioSnapshots.now;
	if (nowSnapshots && nowSnapshots.length > 0) {
		return applySnapshotsToProfile(profile, nowSnapshots);
	}

	return profile;
};

const withUpdatedTimestamp = (profile: Profile): Profile => ({
	...profile,
	updatedAt: new Date().toISOString(),
});

const resolveDetailedFinancialData = (
	financialDataByScenario: Record<string, ScenarioFinancialState>,
	activeScenarioId: string,
	activeTimepoint: Timepoint,
): FinancialData | undefined => financialDataByScenario[activeScenarioId]?.[activeTimepoint];

const calcHamaScoreForState = (
	profile: Profile,
	financialDataByScenario: Record<string, ScenarioFinancialState>,
	activeScenarioId: string,
	activeTimepoint: Timepoint,
): number =>
	calcHamaScoreFromProfile(
		profile,
		resolveDetailedFinancialData(financialDataByScenario, activeScenarioId, activeTimepoint),
	);

const normalizeDisplayUnit = (value: string): DisplayUnit => {
	if (value === "yen" || value === "man") {
		return value;
	}
	return "man";
};

const normalizeSnapshots = (
	raw: Record<string, Record<string, Snapshot[]>>,
): Record<string, ScenarioSnapshotState> => {
	const normalized: Record<string, ScenarioSnapshotState> = {};

	for (const scenarioId of Object.keys(raw)) {
		normalized[scenarioId] = {};
		for (const timepoint of TIMEPOINTS) {
			const snapshots = raw[scenarioId]?.[timepoint];
			if (snapshots) {
				normalized[scenarioId][timepoint] = snapshots;
			}
		}
	}

	return normalized;
};

const normalizePlans = (payload: ServerPayload): PlanSummary[] => {
	const source = payload.plans ?? payload.scenarios ?? [];
	return source.map((plan) => ({
		id: plan.id,
		name: plan.name,
		type: plan.type,
		isDefault: plan.isDefault,
		createdAt: plan.createdAt,
	}));
};

const hydrateFromServer = (payload: ServerPayload): {
	profile: Profile;
	activeScenarioId: string;
	snapshotsByScenario: Record<string, ScenarioSnapshotState>;
	plans: PlanSummary[];
	hamaScore: number;
} => {
	const profile: Profile = {
		id: payload.profile.id,
		name: payload.profile.name,
		currency: "JPY",
		userId: payload.profile.userId,
		createdAt: payload.profile.createdAt,
		updatedAt: payload.profile.updatedAt,
		financial: payload.profile.financial,
		happiness: payload.profile.happiness,
		happinessMemo: payload.profile.happinessMemo ?? {},
		settings: {
			weightHappiness: payload.profile.settings.weightHappiness,
			weightFinance: payload.profile.settings.weightFinance,
			targetAssets: payload.profile.settings.targetAssets,
			displayUnit: normalizeDisplayUnit(payload.profile.settings.displayUnit),
			currency: "JPY",
		},
	};

	return {
		profile,
		activeScenarioId: payload.activeScenarioId || "base",
		snapshotsByScenario: normalizeSnapshots(payload.snapshotsByScenario ?? {}),
		plans: normalizePlans(payload),
		hamaScore: calcHamaScoreFromProfile(profile),
	};
};

const initialProfile = createInitialProfile();

let persistInFlight = false;
let persistRequestedWhileInFlight = false;

const readApiErrorMessage = async (response: Response, fallback: string) => {
	try {
		const payload = (await response.json()) as {
			message?: string;
			error?: string;
		};

		if (payload.error) {
			return `${fallback} (${payload.error})`;
		}

		if (payload.message) {
			return `${fallback} (${payload.message})`;
		}
	} catch {
		// Ignore JSON parse errors and keep the fallback status message.
	}

	return fallback;
};

export const useProfileStore = create<ProfileStoreState>((set, get) => ({
	profile: initialProfile,
	hamaScore: calcHamaScoreForState(initialProfile, {}, "base", "now"),
	activeScenarioId: "base",
	activeTimepoint: "now",
	plans: [{ id: "base", name: "ベースプラン", type: "base", isDefault: true, createdAt: new Date().toISOString() }],
	snapshotsByScenario: {},
	financialDataByScenario: {},
	isHydrated: false,
	isLoading: false,
	isSaving: false,
	lastSavedAt: null,
	errorMessage: null,

	setActiveScenario: (scenarioId) => {
		set((state) => {
			const nextProfile = resolveProfileForSelection(
				state.profile,
				state.snapshotsByScenario,
				scenarioId,
				state.activeTimepoint,
			);

			return {
				activeScenarioId: scenarioId,
				profile: nextProfile,
				hamaScore: calcHamaScoreForState(
					nextProfile,
					state.financialDataByScenario,
					scenarioId,
					state.activeTimepoint,
				),
			};
		});
	},

	setActivePlan: (planId) => {
		get().setActiveScenario(planId);
	},

	setActiveTimepoint: (timepoint) => {
		set((state) => {
			const nextProfile = resolveProfileForSelection(
				state.profile,
				state.snapshotsByScenario,
				state.activeScenarioId,
				timepoint,
			);

			const hasTargetSnapshots = Boolean(
				state.snapshotsByScenario[state.activeScenarioId]?.[timepoint]?.length,
			);

			return {
				activeTimepoint: timepoint,
				profile: nextProfile,
				hamaScore: calcHamaScoreForState(
					nextProfile,
					state.financialDataByScenario,
					state.activeScenarioId,
					timepoint,
				),
				snapshotsByScenario: hasTargetSnapshots
					? state.snapshotsByScenario
					: {
							...state.snapshotsByScenario,
							[state.activeScenarioId]: {
								...state.snapshotsByScenario[state.activeScenarioId],
								[timepoint]: createSnapshotsFromProfile(nextProfile, state.activeScenarioId, timepoint),
							},
						},
			};
		});
	},

	applyTemplate: (template) => {
		set((state) => {
			const nextProfile = withUpdatedTimestamp({
				...state.profile,
				financial: {
					...template.financial,
				},
				happiness: {
					...template.happiness,
				},
				happinessMemo: {},
			});

			const targetTimepoint = template.timepoint;
			const nextSnapshots = createSnapshotsFromProfile(nextProfile, state.activeScenarioId, targetTimepoint);

			return {
				profile: nextProfile,
				activeTimepoint: targetTimepoint,
				hamaScore: calcHamaScoreForState(
					nextProfile,
					state.financialDataByScenario,
					state.activeScenarioId,
					targetTimepoint,
				),
				snapshotsByScenario: {
					...state.snapshotsByScenario,
					[state.activeScenarioId]: {
						[targetTimepoint]: nextSnapshots,
					},
				},
			};
		});
	},

	createPlan: async (name) => {
		const state = get();
		set({ isSaving: true, errorMessage: null });

		try {
			const response = await fetch("/api/plan", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name,
					sourcePlanId: state.activeScenarioId,
				}),
			});

			if (!response.ok) {
				throw new Error(
					await readApiErrorMessage(response, `Failed to create plan: ${response.status}`),
				);
			}

			const payload = (await response.json()) as { planId: string };
			await get().loadProfileFromDb();
			get().setActiveScenario(payload.planId);
			set({ isSaving: false });
		} catch (error) {
			set({
				isSaving: false,
				errorMessage: error instanceof Error ? error.message : "Failed to create plan",
			});
		}
	},

	renamePlan: async (planId, name) => {
		set({ isSaving: true, errorMessage: null });

		try {
			const response = await fetch("/api/plan", {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ planId, name }),
			});

			if (!response.ok) {
				throw new Error(
					await readApiErrorMessage(response, `Failed to rename plan: ${response.status}`),
				);
			}

			await get().loadProfileFromDb();
			set({ isSaving: false });
		} catch (error) {
			set({
				isSaving: false,
				errorMessage: error instanceof Error ? error.message : "Failed to rename plan",
			});
		}
	},

	deletePlan: async (planId) => {
		set({ isSaving: true, errorMessage: null });

		try {
			const response = await fetch("/api/plan", {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ planId }),
			});

			if (!response.ok) {
				throw new Error(
					await readApiErrorMessage(response, `Failed to delete plan: ${response.status}`),
				);
			}

			const payload = (await response.json()) as { activePlanId: string };
			await get().loadProfileFromDb();
			get().setActiveScenario(payload.activePlanId);
			set({ isSaving: false });
		} catch (error) {
			set({
				isSaving: false,
				errorMessage: error instanceof Error ? error.message : "Failed to delete plan",
			});
		}
	},

	setProfileMeta: (patch) => {
		set((state) => ({
			profile: withUpdatedTimestamp({
				...state.profile,
				...patch,
			}),
		}));
	},

	updateFinancial: (itemId, value) => {
		set((state) => {
			const nextProfile = withUpdatedTimestamp({
				...state.profile,
				financial: {
					...state.profile.financial,
					[itemId]: value,
				},
			});

			const nextSnapshots = createSnapshotsFromProfile(
				nextProfile,
				state.activeScenarioId,
				state.activeTimepoint,
			);

			return {
				profile: nextProfile,
				hamaScore: calcHamaScoreForState(
					nextProfile,
					state.financialDataByScenario,
					state.activeScenarioId,
					state.activeTimepoint,
				),
				snapshotsByScenario: {
					...state.snapshotsByScenario,
					[state.activeScenarioId]: {
						...state.snapshotsByScenario[state.activeScenarioId],
						[state.activeTimepoint]: nextSnapshots,
					},
				},
			};
		});
	},

	updateHappiness: (itemId, value, memo) => {
		set((state) => {
			const nextProfile = withUpdatedTimestamp({
				...state.profile,
				happiness: {
					...state.profile.happiness,
					[itemId]: value,
				},
				happinessMemo:
					memo === undefined
						? state.profile.happinessMemo
						: {
								...state.profile.happinessMemo,
								[itemId]: memo,
							},
				});

			const nextSnapshots = createSnapshotsFromProfile(
				nextProfile,
				state.activeScenarioId,
				state.activeTimepoint,
			);

				return {
					profile: nextProfile,
					hamaScore: calcHamaScoreForState(
						nextProfile,
						state.financialDataByScenario,
						state.activeScenarioId,
						state.activeTimepoint,
					),
					snapshotsByScenario: {
						...state.snapshotsByScenario,
						[state.activeScenarioId]: {
							...state.snapshotsByScenario[state.activeScenarioId],
							[state.activeTimepoint]: nextSnapshots,
						},
					},
				};
			});
	},

	updateSettings: (patch) => {
		set((state) => {
			const nextProfile = withUpdatedTimestamp({
				...state.profile,
				settings: {
					...state.profile.settings,
					...patch,
				},
			});

			return {
				profile: nextProfile,
				hamaScore: calcHamaScoreForState(
					nextProfile,
					state.financialDataByScenario,
					state.activeScenarioId,
					state.activeTimepoint,
				),
			};
		});
	},

	setSnapshots: (scenarioId, timepoint, snapshots) => {
		set((state) => ({
			snapshotsByScenario: {
				...state.snapshotsByScenario,
				[scenarioId]: {
					...state.snapshotsByScenario[scenarioId],
					[timepoint]: snapshots,
				},
			},
		}));
	},

	cacheFinancialData: (scenarioId, data) => {
		set((state) => {
			const nextFinancialDataByScenario =
				data === null
					? Object.fromEntries(Object.entries(state.financialDataByScenario).filter(([key]) => key !== scenarioId))
					: {
						...state.financialDataByScenario,
						[scenarioId]: data,
					};

			return {
				financialDataByScenario: nextFinancialDataByScenario,
				hamaScore: calcHamaScoreForState(
					state.profile,
					nextFinancialDataByScenario,
					state.activeScenarioId,
					state.activeTimepoint,
				),
			};
		});
	},

	syncCurrentInputsToSnapshot: (scenarioId, timepoint) => {
		const profile = get().profile;
		const snapshots = createSnapshotsFromProfile(profile, scenarioId, timepoint);
		get().setSnapshots(scenarioId, timepoint, snapshots);
	},

	recalculateHamaScore: () => {
		const state = get();
		set({
			hamaScore: calcHamaScoreForState(
				state.profile,
				state.financialDataByScenario,
				state.activeScenarioId,
				state.activeTimepoint,
			),
		});
	},

	loadProfileFromDb: async () => {
		set({ isLoading: true, errorMessage: null });
		try {
			const currentTimepoint = get().activeTimepoint;
			const response = await fetch("/api/profile", {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
				cache: "no-store",
			});

			if (!response.ok) {
				throw new Error(`Failed to load profile: ${response.status}`);
			}

			const payload = (await response.json()) as ServerPayload;
			const hydrated = hydrateFromServer(payload);
			const nextProfile = resolveProfileForSelection(
				hydrated.profile,
				hydrated.snapshotsByScenario,
				hydrated.activeScenarioId,
				currentTimepoint,
			);

			set({
				...hydrated,
				profile: nextProfile,
				financialDataByScenario: {},
				hamaScore: calcHamaScoreForState(nextProfile, {}, hydrated.activeScenarioId, currentTimepoint),
				activeTimepoint: currentTimepoint,
				isHydrated: true,
				isLoading: false,
				errorMessage: null,
			});
		} catch (error) {
			set({
				isLoading: false,
				isHydrated: true,
				errorMessage: error instanceof Error ? error.message : "Failed to load profile",
			});
		}
	},

	persistProfileToDb: async () => {
		if (persistInFlight) {
			persistRequestedWhileInFlight = true;
			return;
		}

		persistInFlight = true;

		try {
			do {
				persistRequestedWhileInFlight = false;

				const state = get();
				if (!state.isHydrated) {
					continue;
				}

				const currentTimepoint = state.activeTimepoint;

				set({ isSaving: true, errorMessage: null });

				try {
					const response = await fetch("/api/profile", {
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							profile: state.profile,
							scenarioId: state.activeScenarioId,
							timepoint: currentTimepoint,
						}),
					});

					if (!response.ok) {
						throw new Error(
							await readApiErrorMessage(
								response,
								`Failed to save profile: ${response.status}`,
							),
						);
					}

					const payload = (await response.json()) as ServerPayload;
					const hydrated = hydrateFromServer(payload);
					const nextProfile = resolveProfileForSelection(
						hydrated.profile,
						hydrated.snapshotsByScenario,
						hydrated.activeScenarioId,
						currentTimepoint,
					);

					set({
						...hydrated,
						profile: nextProfile,
						financialDataByScenario: {},
						hamaScore: calcHamaScoreForState(nextProfile, {}, hydrated.activeScenarioId, currentTimepoint),
						activeTimepoint: currentTimepoint,
						isSaving: false,
						lastSavedAt: new Date().toISOString(),
						errorMessage: null,
					});
				} catch (error) {
					set({
						isSaving: false,
						errorMessage: error instanceof Error ? error.message : "Failed to save profile",
					});
				}
			} while (persistRequestedWhileInFlight);
		} finally {
			persistInFlight = false;
		}
	},

	clearError: () => {
		set({ errorMessage: null });
	},

	resetProfile: () => {
		const nextProfile = createInitialProfile();

		set({
			profile: nextProfile,
			financialDataByScenario: {},
			hamaScore: calcHamaScoreForState(nextProfile, {}, "base", "now"),
			activeScenarioId: "base",
			activeTimepoint: "now",
			plans: [{ id: "base", name: "ベースプラン", type: "base", isDefault: true, createdAt: new Date().toISOString() }],
			snapshotsByScenario: {},
			isHydrated: false,
			isLoading: false,
			isSaving: false,
			lastSavedAt: null,
			errorMessage: null,
		});
	},
}));
