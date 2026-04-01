export type Timepoint = "now" | "5y" | "10y" | "20y";

export type FinancialItemId = "fin_assets" | "fin_income" | "fin_expense";

export type HappinessItemId =
  | "hap_time"
  | "hap_health"
  | "hap_relation"
  | "hap_selfreal";

export type CategoryId = "financial" | "happiness";
export type ItemId = FinancialItemId | HappinessItemId;

export type FinancialData = {
  fin_assets: number;
  fin_income: number;
  fin_expense: number;
};

export type HappinessData = {
  hap_time: number;
  hap_health: number;
  hap_relation: number;
  hap_selfreal: number;
};

export type HappinessMemoMap = Partial<Record<HappinessItemId, string>>;

export type DisplayUnit = "yen" | "man";

export type ProfileSettings = {
  weightHappiness: number;
  weightFinance: number;
  targetAssets: number | null;
  displayUnit: DisplayUnit;
  currency: "JPY";
};

export type Profile = {
  id: string;
  name: string;
  currency: "JPY";
  userId: string | null;
  financial: FinancialData;
  happiness: HappinessData;
  happinessMemo: HappinessMemoMap;
  settings: ProfileSettings;
  createdAt: string;
  updatedAt: string;
};

export const DEFAULT_FINANCIAL_DATA: FinancialData = {
  fin_assets: 0,
  fin_income: 0,
  fin_expense: 0,
};

export const DEFAULT_HAPPINESS_DATA: HappinessData = {
  hap_time: 50,
  hap_health: 50,
  hap_relation: 50,
  hap_selfreal: 50,
};

export const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  weightHappiness: 0.7,
  weightFinance: 0.3,
  targetAssets: null,
  displayUnit: "man",
  currency: "JPY",
};

export const createInitialProfile = (): Profile => {
  const now = new Date().toISOString();

  return {
    id: "",
    name: "",
    currency: "JPY",
    userId: null,
    financial: { ...DEFAULT_FINANCIAL_DATA },
    happiness: { ...DEFAULT_HAPPINESS_DATA },
    happinessMemo: {},
    settings: { ...DEFAULT_PROFILE_SETTINGS },
    createdAt: now,
    updatedAt: now,
  };
};
