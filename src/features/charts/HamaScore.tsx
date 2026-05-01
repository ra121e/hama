"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfileStore } from "@/store/profileStore";

const scoreTone = (score: number) => {
  if (score >= 80) {
    return {
      label: "良好",
      ringColor: "#15803d",
      badgeVariant: "default" as const,
      textClass: "text-emerald-700",
    };
  }

  if (score >= 60) {
    return {
      label: "安定",
      ringColor: "#2563eb",
      badgeVariant: "secondary" as const,
      textClass: "text-blue-700",
    };
  }

  if (score >= 40) {
    return {
      label: "注意",
      ringColor: "#d97706",
      badgeVariant: "outline" as const,
      textClass: "text-amber-700",
    };
  }

  return {
    label: "要改善",
    ringColor: "#dc2626",
    badgeVariant: "destructive" as const,
    textClass: "text-red-700",
  };
};

export function HamaScore() {
  const storedScore = useProfileStore((state) => state.hamaScore);

  const score = Number.isFinite(storedScore) ? storedScore : 0;
  const displayScore = Math.round(Math.max(0, Math.min(100, score)));

  const tone = scoreTone(displayScore);
  const gradient = `conic-gradient(${tone.ringColor} ${displayScore * 3.6}deg, rgba(161,161,170,0.18) 0deg)`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-xl">HAMAスコア</CardTitle>
          <CardDescription>ハッピーと財務健全性を統合した総合指標</CardDescription>
        </div>
        <Badge variant={tone.badgeVariant}>{tone.label}</Badge>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div
            className="grid h-36 w-36 place-items-center rounded-full p-2"
            style={{ background: gradient }}
            aria-label="HAMAスコアゲージ"
          >
            <div className="grid h-full w-full place-items-center rounded-full bg-background shadow-sm">
              <span className="text-4xl font-bold tracking-tight">{displayScore}</span>
            </div>
          </div>

          <div className="w-full space-y-1 text-sm sm:max-w-xs">
            <p className="text-muted-foreground">現在スコアの目安</p>
            <p className={tone.textClass}>80以上: 良好 / 60以上: 安定 / 40以上: 注意 / 40未満: 要改善</p>
            <p className="text-xs text-muted-foreground">入力値の変更に合わせてリアルタイムで再計算されます。</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
