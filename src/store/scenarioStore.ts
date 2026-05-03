import { create } from "zustand";
import {
	createBaseScenario,
	createScenario,
	type Scenario,
	type ScenarioType,
} from "@/entities/scenario";

type ScenarioStoreState = {
	scenarios: Scenario[];
	selectedScenarioId: string;
	selectScenario: (scenarioId: string) => void;
	addScenario: (name: string, type?: ScenarioType) => string;
	updateScenario: (
		scenarioId: string,
		patch: Partial<Pick<Scenario, "name" | "type" | "isDefault">>,
	) => void;
	removeScenario: (scenarioId: string) => void;
	setScenarioSnapshots: (scenarioId: string, snapshots: Scenario["snapshots"]) => void;
	upsertScenario: (scenario: Scenario) => void;
	resetScenarios: () => void;
};

const initialScenarios = [createBaseScenario()];

export const useScenarioStore = create<ScenarioStoreState>((set, get) => ({
	scenarios: initialScenarios,
	selectedScenarioId: initialScenarios[0].id,

	selectScenario: (scenarioId) => {
		const exists = get().scenarios.some((scenario) => scenario.id === scenarioId);
		if (!exists) {
			return;
		}
		set({ selectedScenarioId: scenarioId });
	},

	addScenario: (name, type = "custom") => {
		const scenario = createScenario(name, type);
		set((state) => ({
			scenarios: [...state.scenarios, scenario],
			selectedScenarioId: scenario.id,
		}));
		return scenario.id;
	},

	updateScenario: (scenarioId, patch) => {
		set((state) => ({
			scenarios: state.scenarios.map((scenario) =>
				scenario.id === scenarioId ? { ...scenario, ...patch } : scenario,
			),
		}));
	},

	removeScenario: (scenarioId) => {
		set((state) => {
			const baseScenario = state.scenarios.find((scenario) => scenario.type === "base");
			if (baseScenario?.id === scenarioId || !baseScenario) {
				return state;
			}

			const nextScenarios = state.scenarios.filter((scenario) => scenario.id !== scenarioId);
			const selectedScenarioId =
				state.selectedScenarioId === scenarioId
					? baseScenario.id
					: state.selectedScenarioId;

			return {
				scenarios: nextScenarios,
				selectedScenarioId,
			};
		});
	},

	setScenarioSnapshots: (scenarioId, snapshots) => {
		set((state) => ({
			scenarios: state.scenarios.map((scenario) =>
				scenario.id === scenarioId ? { ...scenario, snapshots } : scenario,
			),
		}));
	},

	upsertScenario: (scenario) => {
		set((state) => {
			const index = state.scenarios.findIndex((item) => item.id === scenario.id);
			if (index === -1) {
				return { scenarios: [...state.scenarios, scenario] };
			}

			const next = [...state.scenarios];
			next[index] = scenario;
			return { scenarios: next };
		});
	},

	resetScenarios: () => {
		const baseScenario = createBaseScenario();
		set({
			scenarios: [baseScenario],
			selectedScenarioId: baseScenario.id,
		});
	},
}));
