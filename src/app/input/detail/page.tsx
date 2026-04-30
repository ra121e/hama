"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { FinancialItemManager } from "@/features/financial-detail/components/FinancialItemManager";
import { FinancialSpreadsheet } from "@/features/financial-detail/components/FinancialSpreadsheet";
import { useScenarioStore } from "@/store/scenarioStore";

export default function DetailInputPage() {
  const selectedScenarioId = useScenarioStore((state) => state.selectedScenarioId);
  const { toast } = useToast();

  return (
    <main className="mx-auto flex w-full flex-col gap-6 px-6 py-10 sm:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">詳細財務入力</h1>
        <p className="text-sm text-muted-foreground">
          Phase F：階層型財務項目と月次・年次エントリを一元管理するスプレッドシートUIです。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 左パネル：項目管理 */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">財務項目</CardTitle>
            <CardDescription>項目を追加・編集・削除</CardDescription>
          </CardHeader>
          <CardContent>
            <FinancialItemManager />
          </CardContent>
        </Card>

        {/* 右パネル：スプレッドシート */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">月次・年次入力</CardTitle>
            <CardDescription>
              直近36ヶ月は月次入力、37ヶ月以降は年次入力に対応
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <FinancialSpreadsheet
                scenarioId={selectedScenarioId}
                onYearlyExpanded={(expandedCount) => {
                  toast({
                    title: "保存しました",
                    description: `${expandedCount}ヶ月分を展開して保存しました。`,
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
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
