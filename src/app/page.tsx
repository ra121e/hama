"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DualAxisChart } from "@/features/charts/DualAxisChart";
import { HamaScore } from "@/features/charts/HamaScore";
import { RadarChart } from "@/features/charts/RadarChart";
// FinancialInput は MVP 互換でコードベースに残すが、UI からは非表示にする
import { HappinessSlider } from "@/features/happiness/components/HappinessSlider";
import { TimepointSelector } from "@/features/scenario/components/TimepointSelector";
import { useProfileStore } from "@/store/profileStore";
import { usePlanManager } from "@/features/plan/hooks/usePlanManager";

const navItems = [
  { href: "/input", label: "入力画面へ" },
  { href: "/scenario", label: "シナリオ管理" },
  { href: "/simulation", label: "シミュレーション" },
  { href: "/report", label: "レポート" },
  { href: "/settings", label: "設定" },
];

export default function Home() {
  const loadProfileFromDb = useProfileStore((state) => state.loadProfileFromDb);
  const clearError = useProfileStore((state) => state.clearError);
  const isLoading = useProfileStore((state) => state.isLoading);
  const isSaving = useProfileStore((state) => state.isSaving);
  const isHydrated = useProfileStore((state) => state.isHydrated);
  const errorMessage = useProfileStore((state) => state.errorMessage);
  const lastSavedAt = useProfileStore((state) => state.lastSavedAt);
  const happiness = useProfileStore((state) => state.profile.happiness);

  useEffect(() => {
    void loadProfileFromDb();
  }, [loadProfileFromDb]);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 px-4 py-4 sm:px-6 sm:py-6 lg:space-y-8 lg:px-6 lg:py-12">
      {isHydrated ? (
        <>
          <section className="grid h-[calc(100dvh-8.5rem)] min-h-[28rem] grid-rows-[minmax(0,2fr)_minmax(0,1fr)] gap-4 overflow-hidden lg:h-auto lg:min-h-0 lg:grid-cols-[minmax(0,0.43fr)_minmax(0,0.57fr)] lg:grid-rows-none lg:gap-6 lg:items-start lg:overflow-visible">
            <div className="order-2 min-h-0 overflow-y-auto overscroll-contain px-1 pb-1 lg:order-1 lg:overflow-visible lg:px-0 lg:pb-0">
              <Card className="border-primary/20 bg-card/85 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle>入力フォーム</CardTitle>
                  <CardDescription>
                    左側で時間軸ごとに入力し、右側で結果をリアルタイムに確認できます。
                  </CardDescription>
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
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* プラン選択と詳細入力ボタンを横並びで上部に配置 */}
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center">
                      <PlanSelector />
                    </div>
                    <div className="flex-shrink-0">
                      <Link
                        href="/input/detail"
                        className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md hover:opacity-95"
                      >
                        詳細財務入力へ移動
                      </Link>
                    </div>
                  </div>
                  <TimepointSelector />
                  <HappinessSlider />
                </CardContent>
              </Card>
            </div>

            <div className="order-1 min-h-0 space-y-6 overflow-y-auto overscroll-contain px-1 pb-1 lg:order-2 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:self-start lg:px-0 lg:pb-0 lg:pr-1">
              <HamaScore />

              <Card className="border-primary/20 bg-card/85 shadow-sm">
                <CardHeader>
                  <CardTitle>将来推移（デュアル軸ライン）</CardTitle>
                  <CardDescription>
                    左軸は財務、右軸はハッピー4項目とHAMAスコア。将来4時点を同時に確認できます。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DualAxisChart className="h-[420px]" showHappinessSeries />
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-card/85 shadow-sm">
                <CardHeader>
                  <CardTitle>ハッピー4軸レーダーチャート</CardTitle>
                  <CardDescription>現在入力とシナリオ差分を俯瞰できます。</CardDescription>
                </CardHeader>
                <CardContent>
                  <RadarChart happiness={happiness} scenarioName="ダッシュボード" />
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      ) : (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            ダッシュボードデータを準備しています...
          </CardContent>
        </Card>
      )}

      <nav aria-label="関連画面への移動" className="pt-2">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}

function PlanSelector() {
  const { plans, activePlanId, setActivePlan } = usePlanManager();

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-muted-foreground">プラン</label>
      <select
        value={activePlanId}
        onChange={(e) => setActivePlan(e.target.value)}
        className="rounded-md border border-border bg-background px-2 py-1 text-sm"
      >
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
