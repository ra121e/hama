import { create } from "zustand";
import {
	createInitialProfile,
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

type ProfileStoreState = {
	profile: Profile;
	hamaScore: number;
	activeScenarioId: string;
	snapshotsByScenario: Record<string, ScenarioSnapshotState>;
	setActiveScenario: (scenarioId: string) => void;
	setProfileMeta: (patch: Partial<Pick<Profile, "id" | "name" | "userId">>) => void;
	updateFinancial: (itemId: FinancialItemId, value: number) => void;
	updateHappiness: (itemId: HappinessItemId, value: number, memo?: string) => void;
	updateSettings: (patch: Partial<ProfileSettings>) => void;
	setSnapshots: (scenarioId: string, timepoint: Timepoint, snapshots: Snapshot[]) => void;
	syncCurrentInputsToSnapshot: (scenarioId: string, timepoint: Timepoint) => void;
	recalculateHamaScore: () => void;
	resetProfile: () => void;
};

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

const initialProfile = createInitialProfile();

export const useProfileStore = create<ProfileStoreState>((set, get) => ({
	profile: initialProfile,
	hamaScore: calcHamaScoreFromProfile(initialProfile),
	activeScenarioId: "base",
	snapshotsByScenario: {},

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

	resetProfile: () => {
		const nextProfile = createInitialProfile();

		set({
			profile: nextProfile,
			hamaScore: calcHamaScoreFromProfile(nextProfile),
			activeScenarioId: "base",
			snapshotsByScenario: {},
		});
	},
}));
