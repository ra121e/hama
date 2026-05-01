import { describe, expect, it } from "vitest";
import type { Profile } from "../../src/entities/profile";
import { calcFinanceScore, calcHamaScore, calcHamaScoreFromProfile } from "../../src/shared/lib/hama-score";
import type { FinancialData } from "../../src/shared/lib/financial-aggregator";

const createProfile = (): Profile => ({
  id: "profile-1",
  name: "テスト",
  currency: "JPY",
  userId: null,
  financial: {
    fin_assets: 1000000,
    fin_income: 500000,
    fin_expense: 200000,
  },
  happiness: {
    hap_time: 50,
    hap_health: 50,
    hap_relation: 50,
    hap_selfreal: 50,
  },
  happinessMemo: {},
  settings: {
    weightHappiness: 0.7,
    weightFinance: 0.3,
    targetAssets: 2000000,
    displayUnit: "man",
    currency: "JPY",
  },
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
});

describe("hama-score", () => {
  it("FinancialEntry由来の集約データでも財務スコアを計算できる", () => {
    const financial: FinancialData = {
      assets: 2000000,
      income: 500000,
      expense: 200000,
    };

    const score = calcFinanceScore(financial, {
      weightHappiness: 0.7,
      weightFinance: 0.3,
      targetAssets: 2000000,
    });

    expect(score).toBeCloseTo(80);
  });

  it("Snapshot形式の財務データでも HAMA スコアを計算できる", () => {
    const score = calcHamaScore(
      {
        financial: {
          fin_assets: 1500000,
          fin_income: 400000,
          fin_expense: 100000,
        },
        happiness: {
          hap_time: 60,
          hap_health: 50,
          hap_relation: 40,
          hap_selfreal: 50,
        },
      },
      {
        weightHappiness: 0.5,
        weightFinance: 0.5,
        targetAssets: 2000000,
      },
    );

    expect(score).toBeGreaterThan(0);
    expect(Number.isFinite(score)).toBe(true);
  });

  it("FinancialEntry集約データを指定した場合はプロファイル値より優先される", () => {
    const profile = createProfile();
    const scoreFromProfile = calcHamaScoreFromProfile(profile);
    const scoreFromDetail = calcHamaScoreFromProfile(profile, {
      assets: 2000000,
      income: 800000,
      expense: 100000,
    });

    expect(scoreFromDetail).not.toBe(scoreFromProfile);
    expect(Number.isFinite(scoreFromDetail)).toBe(true);
  });

  it("income が 0 でも NaN にならない", () => {
    const score = calcFinanceScore(
      {
        assets: 0,
        income: 0,
        expense: 0,
      },
      {
        weightHappiness: 0.7,
        weightFinance: 0.3,
        targetAssets: null,
      },
    );

    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBe(75);
  });

  it("NaN を含む設定値でも HAMA スコアが NaN にならない", () => {
    const score = calcHamaScore(
      {
        financial: {
          assets: Number.NaN,
          income: Number.NaN,
          expense: Number.NaN,
        },
        happiness: {
          hap_time: 50,
          hap_health: 50,
          hap_relation: 50,
          hap_selfreal: 50,
        },
      },
      {
        weightHappiness: Number.NaN,
        weightFinance: Number.NaN,
        targetAssets: Number.NaN,
      },
    );

    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});
