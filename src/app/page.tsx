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
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <section className="rounded-2xl border border-border bg-card/70 p-8 shadow-sm sm:p-12">
        <p className="text-xs font-semibold tracking-[0.45em] text-primary">H A M A</p>
        <h1 className="mt-4 text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          HAMA（ハマ）
          <span className="mt-2 block text-xl font-medium text-muted-foreground sm:text-2xl">
            Happy Adviser Money Adviser
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-sm text-muted-foreground sm:text-base">
          ダッシュボードを起点に、入力・シナリオ・シミュレーション・レポートを横断しながら、
          人生設計を可視化していきます。
        </p>
      </section>

      <nav aria-label="主要ナビゲーション" className="mt-8">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-lg border border-border bg-card px-4 py-3 text-base font-medium text-card-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground"
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
