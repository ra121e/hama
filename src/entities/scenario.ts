import type { CategoryId, ItemId, Timepoint } from "@/entities/profile";

export type ScenarioType = "base" | "optimistic" | "pessimistic" | "custom";

export type Snapshot = {
  id: string;
  scenarioId: string;
  timepoint: Timepoint;
  categoryId: CategoryId;
  itemId: ItemId;
  value: number;
  memo?: string;
};

export type Scenario = {
  id: string;
  name: string;
  type: ScenarioType;
  isDefault: boolean;
  createdAt: string;
  snapshots: Snapshot[];
};

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const createScenario = (
  name: string,
  type: ScenarioType,
  options?: Partial<Pick<Scenario, "id" | "isDefault" | "createdAt">>,
): Scenario => ({
  id: options?.id ?? createId(),
  name,
  type,
  isDefault: options?.isDefault ?? false,
  createdAt: options?.createdAt ?? new Date().toISOString(),
  snapshots: [],
});

export const createBaseScenario = (): Scenario =>
  createScenario("ベースケース", "base", {
    isDefault: true,
  });
