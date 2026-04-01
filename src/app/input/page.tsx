import { FinancialInput } from "@/features/financial/components/FinancialInput";
import { HappinessSlider } from "@/features/happiness/components/HappinessSlider";

export default function InputPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-6 py-10 sm:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">入力</h1>
        <p className="text-sm text-muted-foreground">
          ハッピーカテゴリと財務カテゴリを同じページで入力できます。
        </p>
      </header>

      <FinancialInput />
      <HappinessSlider />
    </main>
  );
}
