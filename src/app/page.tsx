import Link from "next/link";

const navItems = [
  { href: "/", label: "ダッシュボード" },
  { href: "/input", label: "入力" },
  { href: "/scenario", label: "シナリオ" },
  { href: "/simulation", label: "シミュレーション" },
  { href: "/report", label: "レポート" },
  { href: "/settings", label: "設定" },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-10 sm:px-8">
      <header className="space-y-3 border-b border-border pb-6">
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          HAMA（ハマ） — Happy Adviser Money Adviser
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          財務とハッピーを統合して見える化するライフプランニングダッシュボード
        </p>
      </header>

      <nav aria-label="主要ナビゲーション">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-lg border border-border bg-card px-4 py-3 text-base font-medium text-card-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
