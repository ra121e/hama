"use client";

import { FinancialItemManagerDialog } from "@/features/financial-detail/components/FinancialItemManagerDialog";
import { useToast } from "@/components/ui/use-toast";
import { FinancialSpreadsheet } from "@/features/financial-detail/components/FinancialSpreadsheet";
import { useProfileStore } from "@/store/profileStore";

export default function DetailInputPage() {
  const activeScenarioId = useProfileStore((state) => state.activeScenarioId || "base");
  const { toast } = useToast();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 rounded-3xl border border-border bg-card/70 px-6 py-5 shadow-sm backdrop-blur sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">詳細財務入力</p>
          <h1 className="text-3xl font-semibold tracking-tight">詳細財務入力</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Phase F：スプレッドシートを中心に、月次・年次エントリをすっきり入力できる構成です。
          </p>
        </div>

        <FinancialItemManagerDialog />
      </header>

      <section className="rounded-3xl border border-border bg-card/80 p-4 shadow-sm sm:p-6">
        <div className="overflow-x-auto">
          <FinancialSpreadsheet
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
    </main>
  );
}
