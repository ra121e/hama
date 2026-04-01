import { create } from "zustand";
import type { DisplayUnit, HappinessItemId, Timepoint } from "@/entities/profile";

type ThemeMode = "light" | "dark" | "system";

type ChartOpacityState = {
	financial: number;
	hamaScore: number;
	hap_time: number;
	hap_health: number;
	hap_relation: number;
	hap_selfreal: number;
};

type ChartSeriesKey = keyof ChartOpacityState;

type UIStoreState = {
	themeMode: ThemeMode;
	displayUnit: DisplayUnit;
	selectedTimepoint: Timepoint;
	showScenarioOverlay: boolean;
	chartOpacity: ChartOpacityState;
	setThemeMode: (themeMode: ThemeMode) => void;
	setDisplayUnit: (displayUnit: DisplayUnit) => void;
	setSelectedTimepoint: (timepoint: Timepoint) => void;
	setChartOpacity: (series: ChartSeriesKey, value: number) => void;
	setHappinessOpacity: (itemId: HappinessItemId, value: number) => void;
	toggleScenarioOverlay: () => void;
	resetUI: () => void;
};

const clampOpacity = (value: number) => Math.min(1, Math.max(0, value));

const initialChartOpacity: ChartOpacityState = {
	financial: 0.8,
	hamaScore: 1,
	hap_time: 0.8,
	hap_health: 0.8,
	hap_relation: 0.8,
	hap_selfreal: 0.8,
};

export const useUIStore = create<UIStoreState>((set) => ({
	themeMode: "system",
	displayUnit: "man",
	selectedTimepoint: "now",
	showScenarioOverlay: true,
	chartOpacity: initialChartOpacity,

	setThemeMode: (themeMode) => {
		set({ themeMode });
	},

	setDisplayUnit: (displayUnit) => {
		set({ displayUnit });
	},

	setSelectedTimepoint: (selectedTimepoint) => {
		set({ selectedTimepoint });
	},

	setChartOpacity: (series, value) => {
		set((state) => ({
			chartOpacity: {
				...state.chartOpacity,
				[series]: clampOpacity(value),
			},
		}));
	},

	setHappinessOpacity: (itemId, value) => {
		set((state) => ({
			chartOpacity: {
				...state.chartOpacity,
				[itemId]: clampOpacity(value),
			},
		}));
	},

	toggleScenarioOverlay: () => {
		set((state) => ({ showScenarioOverlay: !state.showScenarioOverlay }));
	},

	resetUI: () => {
		set({
			themeMode: "system",
			displayUnit: "man",
			selectedTimepoint: "now",
			showScenarioOverlay: true,
			chartOpacity: initialChartOpacity,
		});
	},
}));
