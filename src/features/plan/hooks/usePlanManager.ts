"use client";

import { useMemo } from "react";
import { planNameSchema } from "@/features/plan/schema";
import { MAX_ADDITIONAL_PLANS } from "@/features/plan/types";
import { useProfileStore } from "@/store/profileStore";

export function usePlanManager() {
  const plans = useProfileStore((state) => state.plans);
  const activePlanId = useProfileStore((state) => state.activeScenarioId);
  const setActivePlan = useProfileStore((state) => state.setActivePlan);
  const createPlan = useProfileStore((state) => state.createPlan);
  const renamePlan = useProfileStore((state) => state.renamePlan);
  const deletePlan = useProfileStore((state) => state.deletePlan);
  const isSaving = useProfileStore((state) => state.isSaving);

  const additionalPlanCount = useMemo(
    () => plans.filter((plan) => !plan.isDefault).length,
    [plans],
  );

  const canCreatePlan = additionalPlanCount < MAX_ADDITIONAL_PLANS;

  const validatePlanName = (name: string) => planNameSchema.safeParse(name);

  return {
    plans,
    activePlanId,
    isSaving,
    additionalPlanCount,
    canCreatePlan,
    validatePlanName,
    setActivePlan,
    createPlan,
    renamePlan,
    deletePlan,
  };
}
