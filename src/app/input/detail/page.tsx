"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FinancialItemManagerDialog } from "@/features/financial-detail/components/FinancialItemManagerDialog";
import { DetailTemplateSelector } from "@/features/financial-detail/components/DetailTemplateSelector";
import { useToast } from "@/components/ui/use-toast";
import { FinancialSpreadsheet } from "@/features/financial-detail/components/FinancialSpreadsheet";
import { useProfileStore } from "@/store/profileStore";

export default function DetailInputPage() {
  const activeScenarioId = useProfileStore((state) => state.activeScenarioId);
  const plans = useProfileStore((state) => state.plans);
  const activePlan = plans.find((p) => p.id === activeScenarioId);
  const { toast } = useToast();
  const loadProfileFromDb = useProfileStore((state) => state.loadProfileFromDb);
  const clearError = useProfileStore((state) => state.clearError);
  const isHydrated = useProfileStore((state) => state.isHydrated);
  const isLoading = useProfileStore((state) => state.isLoading);
  const errorMessage = useProfileStore((state) => state.errorMessage);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const refreshCompletionResolverRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    void loadProfileFromDb();
  }, [loadProfileFromDb]);

  const handleTemplateApplyComplete = async () => {
    // テンプレート適用後、プロファイルを再読込してスプレッドシートを更新
    await loadProfileFromDb();
    // スプレッドシートを強制的に再マウントしてデータを再読み込みさせる
    await new Promise<void>((resolve) => {
      refreshCompletionResolverRef.current = resolve;
      setRefreshVersion((current) => current + 1);
    });
  };

  const handleItemManagerApplyComplete = async () => {
    // 財務項目管理の適用完了時、プロファイルを再読込してスプレッドシートを更新
    await loadProfileFromDb();
    // スプレッドシートを強制的に再マウントしてデータを再読み込みさせる
    await new Promise<void>((resolve) => {
      refreshCompletionResolverRef.current = resolve;
      setRefreshVersion((current) => current + 1);
    });
  };

  useEffect(() => {
    if (refreshVersion === 0) {
      return;
    }

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        refreshCompletionResolverRef.current?.();
        refreshCompletionResolverRef.current = null;
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) {
        window.cancelAnimationFrame(secondFrame);
      }
    };
  }, [refreshVersion]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 rounded-3xl border border-border bg-card/70 px-6 py-5 shadow-sm backdrop-blur sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">詳細財務入力</p>
          <h1 className="text-3xl font-semibold tracking-tight">詳細財務入力</h1>
          <div className="mt-1">
            <Link href="/scenario" className="text-sm text-primary underline">
              プラン: {activePlan ? activePlan.name : isHydrated ? "ベースプラン" : "読込中..."}
            </Link>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Phase F：スプレッドシートを中心に、月次・年次エントリをすっきり入力できる構成です。
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isHydrated ? (
            <>
              <FinancialItemManagerDialog onApplyComplete={handleItemManagerApplyComplete} />
              <DetailTemplateSelector onApplyComplete={handleTemplateApplyComplete} compact />
            </>
          ) : null}
        </div>
      </header>

      {isHydrated ? (
        <section className="rounded-3xl border border-border bg-card/80 p-4 shadow-sm sm:p-6">
          {/* テンプレートトリガーはヘッダーに移動しました */}

          <div className="overflow-x-auto">
            <FinancialSpreadsheet
              key={refreshVersion}
              scenarioId={activeScenarioId}
              onYearlyExpanded={(expandedCount) => {
                const description =
                  expandedCount === 60
                    ? "年額を60ヶ月分に展開して保存しました。"
                    : `${expandedCount}ヶ月分を展開して保存しました。`;

                toast({
                  title: "保存しました",
                  description,
                });
              }}
              onSaveError={(message) => {
                toast({
                  variant: "destructive",
                  title: "保存に失敗しました",
                  description: message,
                });
              }}
            />
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-border bg-card/80 p-6 text-sm text-muted-foreground shadow-sm">
          {isLoading ? <p>DBから読込中...</p> : null}
          {errorMessage ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-destructive">{errorMessage}</span>
              <button
                type="button"
                onClick={() => {
                  clearError();
                  void loadProfileFromDb();
                }}
                className="rounded-md border border-border px-3 py-1 text-xs font-medium text-foreground"
              >
                再読み込み
              </button>
            </div>
          ) : null}
          {!isLoading && !errorMessage ? <p>詳細財務入力を準備しています...</p> : null}
        </section>
      )}
    </main>
  );
}
