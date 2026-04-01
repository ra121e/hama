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
import type { Snapshot } from "@/entities/scenario";

type ScenarioSnapshotState = Partial<Record<Timepoint, Snapshot[]>>;

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
};

type ProfileStoreState = {
	profile: Profile;
	hamaScore: number;
	activeScenarioId: string;
	snapshotsByScenario: Record<string, ScenarioSnapshotState>;
	isHydrated: boolean;
	isLoading: boolean;
	isSaving: boolean;
	lastSavedAt: string | null;
	errorMessage: string | null;
	setActiveScenario: (scenarioId: string) => void;
	setProfileMeta: (patch: Partial<Pick<Profile, "id" | "name" | "userId">>) => void;
	updateFinancial: (itemId: FinancialItemId, value: number) => void;
	updateHappiness: (itemId: HappinessItemId, value: number, memo?: string) => void;
	updateSettings: (patch: Partial<ProfileSettings>) => void;
	setSnapshots: (scenarioId: string, timepoint: Timepoint, snapshots: Snapshot[]) => void;
	syncCurrentInputsToSnapshot: (scenarioId: string, timepoint: Timepoint) => void;
	recalculateHamaScore: () => void;
	loadProfileFromDb: () => Promise<void>;
	persistProfileToDb: () => Promise<void>;
	clearError: () => void;
	resetProfile: () => void;
};

const TIMEPOINTS: Timepoint[] = ["now", "5y", "10y", "20y"];

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

const withUpdatedTimestamp = (profile: Profile): Profile => ({
	...profile,
	updatedAt: new Date().toISOString(),
});

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

const hydrateFromServer = (payload: ServerPayload): {
	profile: Profile;
	activeScenarioId: string;
	snapshotsByScenario: Record<string, ScenarioSnapshotState>;
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
		hamaScore: calcHamaScoreFromProfile(profile),
	};
};

const initialProfile = createInitialProfile();

export const useProfileStore = create<ProfileStoreState>((set, get) => ({
	profile: initialProfile,
	hamaScore: calcHamaScoreFromProfile(initialProfile),
	activeScenarioId: "base",
	snapshotsByScenario: {},
	isHydrated: false,
	isLoading: false,
	isSaving: false,
	lastSavedAt: null,
	errorMessage: null,

	setActiveScenario: (scenarioId) => {
		set({ activeScenarioId: scenarioId });
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

			return {
				profile: nextProfile,
				hamaScore: calcHamaScoreFromProfile(nextProfile),
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

				return {
					profile: nextProfile,
					hamaScore: calcHamaScoreFromProfile(nextProfile),
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
				hamaScore: calcHamaScoreFromProfile(nextProfile),
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

	syncCurrentInputsToSnapshot: (scenarioId, timepoint) => {
		const profile = get().profile;
		const snapshots = createSnapshotsFromProfile(profile, scenarioId, timepoint);
		get().setSnapshots(scenarioId, timepoint, snapshots);
	},

	recalculateHamaScore: () => {
		const profile = get().profile;
		set({ hamaScore: calcHamaScoreFromProfile(profile) });
	},

	loadProfileFromDb: async () => {
		set({ isLoading: true, errorMessage: null });
		try {
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

			set({
				...hydrated,
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
		const state = get();
		if (!state.isHydrated) {
			return;
		}

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
					timepoint: "now",
				}),
			});

			if (!response.ok) {
				throw new Error(`Failed to save profile: ${response.status}`);
			}

			const payload = (await response.json()) as ServerPayload;
			const hydrated = hydrateFromServer(payload);

			set({
				...hydrated,
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
	},

	clearError: () => {
		set({ errorMessage: null });
	},

	resetProfile: () => {
		const nextProfile = createInitialProfile();

		set({
			profile: nextProfile,
			hamaScore: calcHamaScoreFromProfile(nextProfile),
			activeScenarioId: "base",
			snapshotsByScenario: {},
			isHydrated: false,
			isLoading: false,
			isSaving: false,
			lastSavedAt: null,
			errorMessage: null,
		});
	},
}));
