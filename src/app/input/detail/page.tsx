import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FinancialItemManager } from "@/features/financial-detail/components/FinancialItemManager";

export const metadata = {
  title: "詳細財務入力",
};

export default function DetailInputPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 sm:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">詳細財務入力</h1>
        <p className="text-sm text-muted-foreground">
          Phase F：階層型財務項目を管理し、F03以降のスプレッドシート入力に接続します。
        </p>
      </header>

      <FinancialItemManager />

      <Card>
        <CardHeader>
          <CardTitle>スプレッドシート入力領域</CardTitle>
          <CardDescription>将来的に月次・年次の詳細入力を配置します。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-sm text-muted-foreground">
            スプレッドシート入力エリア（F03で実装）
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
