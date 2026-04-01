"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DualAxisChart } from "@/features/charts/DualAxisChart";
import { HamaScore } from "@/features/charts/HamaScore";
import { RadarChart } from "@/features/charts/RadarChart";
import { HappinessSlider } from "@/features/happiness/components/HappinessSlider";
import { TimepointSelector } from "@/features/scenario/components/TimepointSelector";
import { useProfileStore } from "@/store/profileStore";

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
    <main className="mx-auto w-full max-w-7xl space-y-8 px-6 py-10 sm:px-8 lg:py-12">
      <header className="space-y-3 rounded-2xl border border-border bg-card/70 p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold tracking-[0.38em] text-primary">H A M A</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">HAMA ダッシュボード</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          ハッピー入力と可視化チャートを1画面に集約し、現在と将来のバランスを継続的に確認できます。
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

        <TimepointSelector className="mt-2" />
      </header>

      {isHydrated ? (
        <>
          <section className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <div className="space-y-6">
              <HamaScore />

              <Card className="border-primary/20 bg-card/85 shadow-sm">
                <CardHeader>
                  <CardTitle>ハッピー入力</CardTitle>
                  <CardDescription>
                    スライダーを調整すると、HAMAスコアと各チャートがリアルタイムで更新されます。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <HappinessSlider />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
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
