export type PlanType = "base" | "optimistic" | "pessimistic" | "custom";

export type PlanSummary = {
  id: string;
  name: string;
  type: PlanType;
  isDefault: boolean;
  createdAt: string;
};

export const MAX_ADDITIONAL_PLANS = 5;
