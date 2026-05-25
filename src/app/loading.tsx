import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <main
      aria-label="ページを読み込み中"
      className="mx-auto flex min-h-[calc(100dvh-7rem)] w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6"
    >
      <div
        aria-live="polite"
        role="status"
        className="flex w-full max-w-sm items-center gap-3 rounded-md border border-border bg-card px-4 py-3 text-card-foreground shadow-sm"
      >
        <LoaderCircle className="size-5 shrink-0 animate-spin text-primary" />
        <div className="min-w-0">
          <p className="text-sm font-medium leading-none">Now Loading...</p>
          <p className="mt-1 text-xs text-muted-foreground">
            画面を準備しています
          </p>
        </div>
      </div>
    </main>
  );
}
