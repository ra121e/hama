import { HappinessSlider } from "@/features/happiness/components/HappinessSlider";

export default function InputPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10 sm:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">入力</h1>
        <p className="text-sm text-muted-foreground">
          S05ではハッピーカテゴリ4項目の入力に対応しています。
        </p>
      </header>

      <HappinessSlider />
    </main>
  );
}
