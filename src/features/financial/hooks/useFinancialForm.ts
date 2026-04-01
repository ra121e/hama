"use client";

import { useMemo, useState } from "react";
import type { DisplayUnit, FinancialItemId } from "@/entities/profile";
import { useProfileStore } from "@/store/profileStore";
import { financialFormSchema, financialWarningSchema } from "@/features/financial/schema";
import type { CashflowPeriod, CashflowPeriodState, FinancialWarningMap } from "@/features/financial/types";

const UNIT_MULTIPLIER: Record<DisplayUnit, number> = {
  yen: 1,
  man: 10000,
};

const ANNUAL_FACTOR: Record<CashflowPeriod, number> = {
  monthly: 12,
  yearly: 1,
};

const DEFAULT_PERIOD_STATE: CashflowPeriodState = {
  fin_income: "yearly",
  fin_expense: "yearly",
};

export function useFinancialForm() {
  const financial = useProfileStore((state) => state.profile.financial);
  const displayUnit = useProfileStore((state) => state.profile.settings.displayUnit);
  const hamaScore = useProfileStore((state) => state.hamaScore);
  const updateFinancial = useProfileStore((state) => state.updateFinancial);
  const updateSettings = useProfileStore((state) => state.updateSettings);

  const [periodState, setPeriodState] = useState<CashflowPeriodState>(DEFAULT_PERIOD_STATE);

  const unitMultiplier = UNIT_MULTIPLIER[displayUnit];

  const values = useMemo(() => {
    return {
      fin_assets: financial.fin_assets / unitMultiplier,
      fin_income:
        financial.fin_income / unitMultiplier / ANNUAL_FACTOR[periodState.fin_income],
      fin_expense:
        financial.fin_expense / unitMultiplier / ANNUAL_FACTOR[periodState.fin_expense],
    };
  }, [financial, periodState, unitMultiplier]);

  const errors = useMemo<FinancialWarningMap>(() => {
    const validation = financialFormSchema.safeParse(financial);
    if (validation.success) {
      return {};
    }

    const fieldErrors = validation.error.flatten().fieldErrors;
    return {
      fin_assets: fieldErrors.fin_assets?.[0],
      fin_income: fieldErrors.fin_income?.[0],
      fin_expense: fieldErrors.fin_expense?.[0],
    };
  }, [financial]);

  const warnings = useMemo<FinancialWarningMap>(() => {
    const warningCheck = financialWarningSchema.safeParse(financial);
    if (warningCheck.success) {
      return {};
    }

    const fieldErrors = warningCheck.error.flatten().fieldErrors;
    return {
      fin_assets: fieldErrors.fin_assets?.[0],
      fin_income: fieldErrors.fin_income?.[0],
      fin_expense: fieldErrors.fin_expense?.[0],
    };
  }, [financial]);

  const setDisplayUnit = (unit: DisplayUnit) => {
    updateSettings({ displayUnit: unit });
  };

  const setPeriod = (field: "fin_income" | "fin_expense", period: CashflowPeriod) => {
    setPeriodState((prev) => ({
      ...prev,
      [field]: period,
    }));
  };

  const setFinancialValue = (field: FinancialItemId, displayValue: number) => {
    const annualValue =
      field === "fin_income"
        ? displayValue * unitMultiplier * ANNUAL_FACTOR[periodState.fin_income]
        : field === "fin_expense"
          ? displayValue * unitMultiplier * ANNUAL_FACTOR[periodState.fin_expense]
          : displayValue * unitMultiplier;

    updateFinancial(field, annualValue);
  };

  return {
    values,
    errors,
    warnings,
    displayUnit,
    periodState,
    hamaScore,
    setDisplayUnit,
    setPeriod,
    setFinancialValue,
  };
}
