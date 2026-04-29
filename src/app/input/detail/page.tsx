import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "詳細財務入力",
};

export default function DetailInputPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10 sm:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">詳細財務入力</h1>
        <p className="text-sm text-muted-foreground">
          Phase F：詳細財務入力ページ（開発中）
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Phase F</CardTitle>
          <CardDescription>詳細財務入力の基盤を構築しています。</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Phase F：詳細財務入力ページ（開発中）
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
