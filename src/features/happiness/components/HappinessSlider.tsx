"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useHappinessForm } from "@/features/happiness/hooks/useHappinessForm";
import type { HappinessItemId } from "@/entities/profile";

export function HappinessSlider() {
  const { fields, values, memos, errors, hamaScore, setScore, setMemo } = useHappinessForm();

  const handleInputChange = (itemId: HappinessItemId, value: string) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return;
    }
    setScore(itemId, parsed);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>ハッピースコア入力</CardTitle>
          <CardDescription>
            各項目を0〜100で評価し、背景メモを残してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            現在のHAMAスコア: <span className="font-semibold text-foreground">{hamaScore.toFixed(1)}</span>
          </p>
        </CardContent>
      </Card>

      {fields.map((field) => (
        <Card key={field.id}>
          <CardHeader>
            <CardTitle>{field.label}</CardTitle>
            <CardDescription>{field.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_96px] sm:items-center">
              <div className="space-y-2">
                <Label htmlFor={`${field.id}-slider`}>スコア（0〜100）</Label>
                <Slider
                  id={`${field.id}-slider`}
                  min={0}
                  max={100}
                  step={1}
                  value={[values[field.id]]}
                  onValueChange={(value) =>
                    setScore(field.id, Array.isArray(value) ? (value[0] ?? 0) : value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${field.id}-input`}>数値入力</Label>
                <Input
                  id={`${field.id}-input`}
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={values[field.id]}
                  onChange={(event) => handleInputChange(field.id, event.target.value)}
                />
              </div>
            </div>
            {errors[field.id] ? (
              <p className="text-xs text-destructive">{errors[field.id]}</p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor={`${field.id}-memo`}>メモ（任意）</Label>
              <Textarea
                id={`${field.id}-memo`}
                maxLength={200}
                placeholder={field.memoPlaceholder}
                value={memos[field.id] ?? ""}
                onChange={(event) => setMemo(field.id, event.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
