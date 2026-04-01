"use client";

import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadarChart } from "@/features/charts/RadarChart";
import { FinancialInput } from "@/features/financial/components/FinancialInput";
import { HappinessSlider } from "@/features/happiness/components/HappinessSlider";
import { useProfileStore } from "@/store/profileStore";

const SAMPLE_RADAR_SERIES = [
  {
    name: "ベースケース",
    values: [72, 68, 75, 81] as [number, number, number, number],
  },
  {
    name: "サンプル比較",
    values: [66, 74, 79, 85] as [number, number, number, number],
  },
];

export default function InputPage() {
  const loadProfileFromDb = useProfileStore((state) => state.loadProfileFromDb);
  const clearError = useProfileStore((state) => state.clearError);
  const isLoading = useProfileStore((state) => state.isLoading);
  const isSaving = useProfileStore((state) => state.isSaving);
  const isHydrated = useProfileStore((state) => state.isHydrated);
  const errorMessage = useProfileStore((state) => state.errorMessage);
  const lastSavedAt = useProfileStore((state) => state.lastSavedAt);

  useEffect(() => {
    void loadProfileFromDb();
  }, [loadProfileFromDb]);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-6 py-10 sm:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">入力</h1>
        <p className="text-sm text-muted-foreground">
          ハッピーカテゴリと財務カテゴリを同じページで入力できます。
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {isLoading ? <span>DBから読込中...</span> : null}
          {isSaving ? <span>保存中...</span> : null}
          {lastSavedAt ? (
            <span>
              最終保存: {new Date(lastSavedAt).toLocaleTimeString("ja-JP")}
            </span>
          ) : null}
        </div>
        {errorMessage ? (
          <div className="flex items-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={clearError}
              className="rounded-sm border border-destructive/40 px-2 py-0.5"
            >
              閉じる
            </button>
          </div>
        ) : null}
      </header>

      {isHydrated ? (
        <>
          <FinancialInput />
          <HappinessSlider />
          <Card>
            <CardHeader>
              <CardTitle>レーダーチャート（サンプル）</CardTitle>
              <CardDescription>
                ハッピー4項目の可視化サンプル。将来的にストア連携でリアルタイム反映します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadarChart series={SAMPLE_RADAR_SERIES} />
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="rounded-md border border-border px-4 py-6 text-sm text-muted-foreground">
          入力データを準備しています...
        </div>
      )}
    </main>
  );
}
