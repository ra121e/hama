"use client";

import { useEffect } from "react";
import Link from "next/link";
import { FinancialInput } from "@/features/financial/components/FinancialInput";
import { HappinessSlider } from "@/features/happiness/components/HappinessSlider";
import { PlanSwitcher } from "@/features/plan/components/PlanSwitcher";
import { TemplateSelector } from "@/features/plan/components/TemplateSelector";
import { TimepointSelector } from "@/features/scenario/components/TimepointSelector";
import { useProfileStore } from "@/store/profileStore";

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
        <h1 className="text-3xl font-semibold tracking-tight">入力（簡易）</h1>
        <p className="text-sm text-muted-foreground">
          財務カテゴリとハッピーカテゴリを集中入力するページです。可視化はダッシュボードで確認します。
        </p>
        <Link href="/" className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline">
          HAMA ダッシュボードへ戻る
        </Link>
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

        <TimepointSelector className="mt-2" />
      </header>

      {isHydrated ? (
        <div className="space-y-6">
          <TemplateSelector />
          <PlanSwitcher />
          <FinancialInput />
          <HappinessSlider />
        </div>
      ) : (
        <div className="rounded-md border border-border px-4 py-6 text-sm text-muted-foreground">
          入力データを準備しています...
        </div>
      )}
    </main>
  );
}
