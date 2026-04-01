"use client";

import { useEffect, useMemo, useRef } from "react";
import type { HappinessItemId } from "@/entities/profile";
import { useProfileStore } from "@/store/profileStore";
import { happinessFormSchema, happinessMemoSchema } from "@/features/happiness/schema";
import { HAPPINESS_FIELDS } from "@/features/happiness/types";

const AUTO_SAVE_DEBOUNCE_MS = 700;

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
  const activeScenarioId = useProfileStore((state) => state.activeScenarioId);
  const activeTimepoint = useProfileStore((state) => state.activeTimepoint);
  const isHydrated = useProfileStore((state) => state.isHydrated);
  const hamaScore = useProfileStore((state) => state.hamaScore);
  const updateHappiness = useProfileStore((state) => state.updateHappiness);
  const persistProfileToDb = useProfileStore((state) => state.persistProfileToDb);
  const hasInitializedAutoSave = useRef(false);

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

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!hasInitializedAutoSave.current) {
      hasInitializedAutoSave.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      void persistProfileToDb();
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    activeScenarioId,
    activeTimepoint,
    happiness.hap_time,
    happiness.hap_health,
    happiness.hap_relation,
    happiness.hap_selfreal,
    isHydrated,
    memos.hap_time,
    memos.hap_health,
    memos.hap_relation,
    memos.hap_selfreal,
    persistProfileToDb,
  ]);

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
