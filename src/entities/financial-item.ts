export type FinancialItemLevel = "large" | "medium" | "small";

export type FinancialItemCategory = "income" | "expense" | "asset" | "liability";

export type FinancialAutoCalc = "none" | "compound" | "depreciation" | "cashflow";

export type FinancialItem = {
  id: string;
  profileId: string;
  scenarioId: string;
  level: FinancialItemLevel;
  parentId: string | null;
  name: string;
  category: FinancialItemCategory;
  autoCalc: FinancialAutoCalc;
  rate: number | null;
  sortOrder: number;
};

export type FinancialEntry = {
  id: string;
  scenarioId: string;
  itemId: string;
  yearMonth: string;
  value: number;
  isExpanded: boolean;
  memo: string | null;
};
