"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import type { DisplayUnit, FinancialItemId } from "@/entities/profile";
import { useFinancialForm } from "@/features/financial/hooks/useFinancialForm";
import { DISPLAY_UNIT_LABEL, FINANCIAL_FIELDS, type CashflowPeriod } from "@/features/financial/types";

const parseNumericInput = (value: string) => {
  const normalized = value.replace(/,/g, "").trim();
  if (normalized === "") {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
};

export function FinancialInput() {
  const {
    values,
    errors,
    warnings,
    displayUnit,
    periodState,
    hamaScore,
    setDisplayUnit,
    setPeriod,
    setFinancialValue,
  } = useFinancialForm();

  const handleValueChange = (field: FinancialItemId, value: string) => {
    const parsed = parseNumericInput(value);
    if (parsed === null) {
      return;
    }

    setFinancialValue(field, parsed);
  };

  const renderPeriodToggle = (field: "fin_income" | "fin_expense") => (
    <div className="space-y-2">
      <Label>入力粒度</Label>
      <div className="flex gap-2">
        <Toggle
          variant="outline"
          size="sm"
          pressed={periodState[field] === "monthly"}
          onPressedChange={(pressed) => {
            if (pressed) {
              setPeriod(field, "monthly" as CashflowPeriod);
            }
          }}
        >
          月次
        </Toggle>
        <Toggle
          variant="outline"
          size="sm"
          pressed={periodState[field] === "yearly"}
          onPressedChange={(pressed) => {
            if (pressed) {
              setPeriod(field, "yearly" as CashflowPeriod);
            }
          }}
        >
          年次
        </Toggle>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>財務入力</CardTitle>
          <CardDescription>
            総資産・収入・支出を入力します。収入/支出は月次・年次を切り替えできます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>表示単位</Label>
            <div className="flex gap-2">
              <Toggle
                variant="outline"
                size="sm"
                pressed={displayUnit === "yen"}
                onPressedChange={(pressed) => {
                  if (pressed) {
                    setDisplayUnit("yen" as DisplayUnit);
                  }
                }}
              >
                円
              </Toggle>
              <Toggle
                variant="outline"
                size="sm"
                pressed={displayUnit === "man"}
                onPressedChange={(pressed) => {
                  if (pressed) {
                    setDisplayUnit("man" as DisplayUnit);
                  }
                }}
              >
                万円
              </Toggle>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            現在のHAMAスコア: <span className="font-semibold text-foreground">{Math.round(hamaScore)}</span>
          </p>
        </CardContent>
      </Card>

      {FINANCIAL_FIELDS.map((field) => {
        const unitLabel = DISPLAY_UNIT_LABEL[displayUnit];

        return (
          <Card key={field.id}>
            <CardHeader>
              <CardTitle>{field.label}</CardTitle>
              <CardDescription>{field.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor={`${field.id}-input`}>金額（{unitLabel}）</Label>
                  <Input
                    id={`${field.id}-input`}
                    type="number"
                    inputMode="decimal"
                    min={-999999999999999}
                    step={displayUnit === "man" ? 1 : 1000}
                    value={Number.isFinite(values[field.id]) ? values[field.id] : 0}
                    onChange={(event) => handleValueChange(field.id, event.target.value)}
                  />
                </div>
                {field.id === "fin_income" || field.id === "fin_expense"
                  ? renderPeriodToggle(field.id)
                  : null}
              </div>

              {errors[field.id] ? (
                <p className="text-xs text-destructive">{errors[field.id]}</p>
              ) : null}
              {warnings[field.id] ? (
                <p className="text-xs text-amber-600">{warnings[field.id]}</p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
