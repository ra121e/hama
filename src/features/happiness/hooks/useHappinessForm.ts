"use client";

import { useMemo } from "react";
import type { HappinessItemId } from "@/entities/profile";
import { useProfileStore } from "@/store/profileStore";
import { happinessFormSchema, happinessMemoSchema } from "@/features/happiness/schema";
import { HAPPINESS_FIELDS } from "@/features/happiness/types";

type HappinessErrors = Partial<Record<HappinessItemId, string>>;

const normalizeScore = (value: number) => {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
};

export function useHappinessForm() {
  const happiness = useProfileStore((state) => state.profile.happiness);
  const memos = useProfileStore((state) => state.profile.happinessMemo);
  const hamaScore = useProfileStore((state) => state.hamaScore);
  const updateHappiness = useProfileStore((state) => state.updateHappiness);

  const errors = useMemo<HappinessErrors>(() => {
    const result = happinessFormSchema.safeParse(happiness);
    if (result.success) {
      return {};
    }

    const fieldErrors = result.error.flatten().fieldErrors;
    return {
      hap_time: fieldErrors.hap_time?.[0],
      hap_health: fieldErrors.hap_health?.[0],
      hap_relation: fieldErrors.hap_relation?.[0],
      hap_selfreal: fieldErrors.hap_selfreal?.[0],
    };
  }, [happiness]);

  const setScore = (itemId: HappinessItemId, value: number) => {
    updateHappiness(itemId, normalizeScore(value));
  };

  const setMemo = (itemId: HappinessItemId, memo: string) => {
    const validatedMemo = happinessMemoSchema.safeParse(memo);
    if (!validatedMemo.success) {
      return;
    }

    updateHappiness(itemId, happiness[itemId], memo);
  };

  return {
    fields: HAPPINESS_FIELDS,
    values: happiness,
    memos,
    errors,
    hamaScore,
    setScore,
    setMemo,
  };
}
