# ARCHITECTURE.md — HAMA 技術アーキテクチャ設計書

**製品名**：HAMA（ハマ）— Happy Adviser Money Adviser
**バージョン**：MVP v1.0 / Phase F 設計含む
**最終更新**：2026-04-29

---

## 1. 技術スタック

| レイヤー | 技術 | 選定理由 |
|---|---|---|
| フレームワーク | Next.js 15 (App Router) | SSR/CSR統合・APIルート内蔵・Vercel親和性 |
| 言語 | TypeScript 5.x | 型安全・スキーマ駆動開発に必須 |
| スタイリング | Tailwind CSS v4 + shadcn/ui | 高速UI構築・アクセシブルコンポーネント |
| グラフ | Apache ECharts 5.x | デュアル軸・複数シリーズ・レーダーを公式サポート |
| 状態管理 | Zustand | 軽量・シンプル・Next.js App Routerと相性良好 |
| バリデーション | Zod | スキーマ定義をフロント/バックエンドで共有 |
| 認証 | **MVP：なし** → フェーズ2：Clerk（個人） → フェーズ3：Clerk Organization（企業） | 段階的に追加。MVPでは認証不要 |
| DB | PostgreSQL | マルチユーザー対応・本番環境標準 |
| ORM | Prisma | 直感的なスキーマ定義・マイグレーション自動化・Copilotとの相性◎ |
| グリッドUI（Phase F） | ag-Grid または TanStack Table | 仮想スクロール・階層行・大量月次データの表示に対応 |
| ホスティング | EC2 t4g.small（ARM64）+ RDS PostgreSQL | コスト効率・ARM64 Graviton2で性能/コストバランス良好 |
| コンテナ | Docker Compose（ARM64対応） | ローカル開発環境の統一 |
| テスト | Vitest + Testing Library | 高速・Vite互換・shadcn UIと相性良好 |

---

## 2. ディレクトリ構造

Feature Sliced Design（FSD）準拠。ドメイン単位でファイルを配置し、機能追加時の影響範囲を局所化する。

```
hama/
├── docker-compose.yml
├── Dockerfile
├── .env.example
│
├── prisma/
│   └── schema.prisma               # DBスキーマ定義
│
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # ルートレイアウト（Provider類ラップ）
│   │   ├── page.tsx                # ダッシュボード（/）ハッピースコア入力のみ
│   │   ├── input/
│   │   │   ├── page.tsx            # 財務MVP入力（/input）4時点タブ切替
│   │   │   └── detail/
│   │   │       └── page.tsx        # 【Phase F】詳細財務入力（/input/detail）
│   │   ├── scenario/
│   │   │   └── page.tsx            # プラン管理（/scenario）
│   │   ├── simulation/
│   │   │   └── page.tsx            # What-Ifシミュレーション（/simulation）
│   │   ├── report/
│   │   │   └── page.tsx            # レポート出力（/report）
│   │   ├── settings/
│   │   │   └── page.tsx            # 設定画面（/settings）
│   │   └── api/
│   │       ├── health/
│   │       │   └── route.ts        # DB疎通確認
│   │       ├── profile/
│   │       │   └── route.ts        # プロファイルCRUD
│   │       ├── scenario/
│   │       │   └── route.ts        # プランCRUD（DBモデル名はScenario）
│   │       └── financial-entries/
│   │           └── route.ts        # 【Phase F】FinancialEntry CRUD
│   │
│   ├── features/                   # ドメイン別機能モジュール
│   │   ├── auth/                   # 【フェーズ2で実装】MVP時点は空ディレクトリ
│   │   │   └── .gitkeep
│   │   ├── financial/              # MVP財務入力（シンプル版）
│   │   │   ├── components/         # FinancialInputForm等
│   │   │   ├── hooks/              # useFinancialForm
│   │   │   ├── schema.ts           # Zodスキーマ（財務MVP）
│   │   │   └── types.ts
│   │   ├── financial-detail/       # 【Phase F】詳細財務入力・MVP時点は空
│   │   │   ├── components/         # SpreadsheetGrid・HierarchyRow等
│   │   │   ├── hooks/              # useFinancialItems・useAutoCalc
│   │   │   ├── engine/             # 複利・減価償却・CF自動計算ロジック
│   │   │   ├── schema.ts           # Zodスキーマ（詳細財務）
│   │   │   ├── types.ts
│   │   │   └── .gitkeep
│   │   ├── happiness/
│   │   │   ├── components/         # HappinessSlider等
│   │   │   ├── hooks/              # useHappinessForm
│   │   │   ├── schema.ts           # Zodスキーマ（ハッピー）
│   │   │   └── types.ts
│   │   ├── scenario/               # プラン管理（DBモデル名Scenarioに対応）
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   └── charts/
│   │       ├── RadarChart.tsx      # レーダーチャート（ECharts）
│   │       ├── DualAxisChart.tsx   # デュアル軸ラインチャート（ECharts）
│   │       └── HamaScore.tsx       # スコアメーター表示
│   │
│   ├── entities/                   # データエンティティ型定義
│   │   ├── profile.ts
│   │   ├── scenario.ts             # Plan型のエイリアスも定義
│   │   └── financial-item.ts       # 【Phase F】FinancialItem型定義
│   │
│   ├── shared/                     # 共有ユーティリティ
│   │   ├── components/             # shadcn/ui再エクスポート
│   │   ├── hooks/                  # useDebounce等
│   │   ├── lib/
│   │   │   ├── hama-score.ts           # HAMAスコア計算ロジック
│   │   │   ├── normalizer.ts           # 財務値の正規化ユーティリティ
│   │   │   ├── formatter.ts            # 通貨フォーマット（万円表示等）
│   │   │   └── financial-aggregator.ts # 【Phase F】月次→集約ロジック（表示時動的計算）
│   │   └── config/
│   │       └── categories.ts           # カテゴリ・項目定義（設定駆動）
│   │
│   └── store/                      # Zustand ストア
│       ├── profileStore.ts         # プロファイル状態
│       ├── scenarioStore.ts        # プラン一覧・選択状態
│       └── uiStore.ts              # UI状態（チャート設定等）
│
├── tests/
│   ├── unit/
│   │   ├── hama-score.test.ts
│   │   └── financial-aggregator.test.ts  # 【Phase F】集約ロジックのテスト
│   └── integration/
│       └── api.test.ts
│
└── public/
    └── templates/                  # ライフステージ別サンプルJSON
        ├── twenties.json
        ├── thirties.json
        ├── forties.json
        └── fifties.json
```

---

## 3. データフロー

```
【ダッシュボード（/）— ハッピースコアのみ】
  スライダー入力
      │
      ▼
  Zodバリデーション（features/happiness/schema.ts）
      │
      ▼
  Zustand Store（profileStore）→ DB保存（Snapshot）
      │
      ├──► HAMAスコア計算（hama-score.ts） → HamaScore.tsx
      └──► RadarChart.tsx（ハッピー軸レーダー・リアルタイム更新）

【入力ページ（/input）— 財務MVP】
  財務3項目 × 4時点のテキスト入力
      │
      ▼
  Zodバリデーション（features/financial/schema.ts）
      │
      ▼
  Zustand Store → DB保存（Snapshot: timepoint × itemId）
      │
      └──► DualAxisChart.tsx（財務 左Y軸 / ハッピー各項目・HAMAスコア 右Y軸）

【詳細財務入力ページ（/input/detail）— Phase F】
  スプレッドシート型UI
    ├── 直近36ヶ月：月次入力
    └── 37ヶ月以降：年次入力 → 12ヶ月自動展開
      │
      ▼
  自動計算エンジン（features/financial-detail/engine/）
    ├── 複利計算（月次利率 = 年利率 ÷ 12）
    ├── 減価償却（建物のみ・土地不変）
    └── CF自動生成（資産収益 → 収入欄へ反映）
      │
      ▼
  DB保存（FinancialEntry: yearMonth × itemId、常に月次単位）
      │
      ▼
  financial-aggregator.ts（表示リクエスト時に動的集約）
    ├── 月次集計  → 詳細グラフ用
    ├── 年次集計  → 推移グラフ用
    └── 4時点集計 → ダッシュボードの DualAxisChart へ反映
```

---

## 4. DBスキーマ設計（Prisma）

### 認証ロードマップとスキーマ方針

```
MVP          認証なし。Profileを直接作成・操作（単一ユーザー想定）
     ↓
フェーズ2    個人向け認証追加（Clerk）。UserモデルとProfileを紐付け
     ↓
フェーズ3    企業向け拡張（Organizationモデル追加）※実装計画外
```

`userId` フィールドはMVPでは `nullable` にしておき、フェーズ2移行時に `required` に変更する。

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ========================================
// MVP スコープ
// ========================================

// プロファイル（人生計画1件）
model Profile {
  id        String     @id @default(uuid())
  name      String
  currency  String     @default("JPY")
  userId    String?    // nullable → フェーズ2で String @unique に変更
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  scenarios Scenario[]
  settings  Settings?
}

// プラン（UX上は「名前付きプラン」。DBモデル名は Scenario のまま維持）
// 例：「現状維持プラン」「転職プラン」「早期リタイアプラン」
model Scenario {
  id        String     @id @default(uuid())
  name      String     // ユーザーが自由に命名
  type      String     // default | custom （楽観/悲観は廃止）
  isDefault Boolean    @default(false)  // デフォルトプランは削除不可
  createdAt DateTime   @default(now())
  profile   Profile    @relation(fields: [profileId], references: [id], onDelete: Cascade)
  profileId String
  snapshots Snapshot[]
}

// スナップショット（MVP財務・ハッピー入力値を4時点で保存）
model Snapshot {
  id         String   @id @default(uuid())
  timepoint  String   // now | 5y | 10y | 20y
  categoryId String   // financial | happiness
  itemId     String   // fin_assets | hap_health など
  value      Float
  memo       String?
  scenario   Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
  scenarioId String
}

// 設定（プロファイル別）
model Settings {
  weightHappiness Float   @default(0.7)
  weightFinance   Float   @default(0.3)
  targetAssets    Float?
  displayUnit     String  @default("man")  // 円 | 万円
  profile         Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  profileId       String  @id
}

// ========================================
// Phase F以降（詳細財務入力追加時に有効化）
// ========================================

// 財務項目定義（階層構造：大項目固定・中小項目はユーザー追加可能）
// model FinancialItem {
//   id         String   @id @default(uuid())
//   profileId  String
//   profile    Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
//   level      String   // large | medium | small
//   parentId   String?  // 親項目ID（大項目はnull）
//   name       String   // "手取給与" "家賃" など
//   category   String   // income | expense | asset | liability
//   autoCalc   String   @default("none")  // none | compound | depreciation | cashflow
//   rate       Float?   // 年利率・年減価率（autoCalcがnone以外の場合に使用）
//   sortOrder  Int      @default(0)
// }

// 財務エントリ（常に月次単位で保存）
// 直近36ヶ月：ユーザー入力値をそのまま保存
// 37ヶ月以降：年次入力を12ヶ月に自動展開して保存
// model FinancialEntry {
//   id         String   @id @default(uuid())
//   scenarioId String
//   scenario   Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
//   itemId     String   // FinancialItem.id
//   yearMonth  String   // "2026-04" 形式（常に月次単位）
//   value      Float    // 月次の値（収入・支出は月額、資産・負債は月末残高）
//   isExpanded Boolean  @default(false)  // 年次入力から自動展開された場合 true
//   memo       String?
// }

// ========================================
// フェーズ2以降（認証追加時に有効化）
// ========================================

// model User {
//   id        String    @id @default(uuid())
//   clerkId   String    @unique
//   email     String    @unique
//   name      String?
//   profiles  Profile[]
//   createdAt DateTime  @default(now())
// }

// ========================================
// フェーズ3以降（企業向け拡張時に有効化）
// ========================================

// model Organization {
//   id         String   @id @default(uuid())
//   clerkOrgId String   @unique
//   name       String
//   users      User[]
//   createdAt  DateTime @default(now())
// }
```

**データの将来階層（設計上の見通し）：**
```
[フェーズ3] Organization（企業）
               └── [フェーズ2] User（個人）
                                 └── [MVP] Profile（人生計画）
                                              └── Scenario（プラン）
                                                    ├── Snapshot（MVP財務・ハッピー）
                                                    └── [Phase F] FinancialEntry（月次財務）
```

**主要コマンド：**
```bash
npx prisma migrate dev --name init   # マイグレーション作成・適用
npx prisma generate                  # Prisma Clientを生成
npx prisma studio                    # ブラウザでDB確認（開発時に便利）
```

---

## 5. HAMAスコア計算ロジック

```typescript
// shared/lib/hama-score.ts

/**
 * 財務健全性指数（0〜100にキャッピング）
 * = 収支バランス比率 と 資産達成率 の平均
 */
function calcFinanceScore(financial: FinancialData, settings: Settings): number {
  const cashflowRatio = Math.max(0, (financial.income - financial.expense) / financial.income) * 100
  const assetRatio = settings.targetAssets > 0
    ? Math.min(100, (financial.assets / settings.targetAssets) * 100)
    : 50  // 目標未設定時はニュートラル値
  return (cashflowRatio + assetRatio) / 2
}

/**
 * ハッピースコア（項目の単純平均）
 */
function calcHappinessScore(happiness: HappinessData): number {
  const values = Object.values(happiness)
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/**
 * HAMAスコア（総合）
 */
export function calcHamaScore(data: SnapshotData, settings: Settings): number {
  const finScore = calcFinanceScore(data.financial, settings)
  const hapScore = calcHappinessScore(data.happiness)
  return (hapScore * settings.weightHappiness) + (finScore * settings.weightFinance)
}
```

---

## 6. Phase F：financial-aggregator.ts 設計

集約は「保存時」ではなく**「表示リクエスト時」に動的に行う**。

```typescript
// shared/lib/financial-aggregator.ts

type AggregateTarget = 'now' | '5y' | '10y' | '20y'
type AggregateType   = 'balance' | 'flow'  // 残高系 | フロー系

/**
 * 月次エントリから指定時点の値を集約する
 * - balance（資産・負債）：指定月末の残高
 * - flow（収入・支出）   ：指定年の12ヶ月合計
 */
export function aggregateToTimepoint(
  entries: FinancialEntry[],
  target: AggregateTarget,
  type: AggregateType,
  baseDate: Date
): number { ... }

/**
 * 月次エントリを年次に集約する（グラフ用）
 */
export function aggregateToYearly(
  entries: FinancialEntry[],
  type: AggregateType
): Record<string, number> { ... }

/**
 * 月次エントリをそのまま返す（直近36ヶ月グラフ用）
 */
export function getMonthlyEntries(
  entries: FinancialEntry[],
  months: number = 36
): FinancialEntry[] { ... }
```

---

## 7. EChartsグラフ設定方針

### 7.1 レーダーチャート
```typescript
// indicator にハッピー4項目を設定（max: 100）
// 財務軸を追加する場合は正規化した値（0〜100）で別 indicator として追加
// 選択中の1プランのデータのみを seriesData に設定（グラフオーバーレイは行わない）
// 時点切替（現在/5年後/10年後/20年後）は series.data を差し替えてアニメーション遷移
```

### 7.2 デュアル軸ラインチャート
```typescript
// yAxis: [
//   { type: 'value', name: '金額（万円）', position: 'left' },
//   { type: 'value', name: 'スコア', min: 0, max: 100, position: 'right' }
// ]
//
// 右軸の系列（yAxisIndex: 1）：
//   - ハッピー4項目を個別の面グラフで表示（デフォルト）
//   - HAMAスコアを折れ線グラフで表示
//
// 透過度制御：areaStyle.opacity と lineStyle.opacity をUIスライダーと連動
//   - デフォルト: 各項目 opacity 0.3（面）/ 0.8（線）、HAMAスコア 1.0
//
// 財務系 series は yAxisIndex: 0、スコア系 series は yAxisIndex: 1
//
// Phase F完了後：X軸を月次に拡張し financial-aggregator.ts の集約値を使用
```

---

## 8. Docker Compose 構成（EC2 t4g.small / ARM64対応）

本番環境は **AWS EC2 t4g.small（Graviton2 / ARM64）** を使用する。
Docker設定はすべて **linux/arm64** ネイティブで動作するように構成する。

### 8.1 docker-compose.yml

```yaml
# docker-compose.yml
version: '3.9'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      platforms:
        - linux/arm64      # t4g.small（Graviton2/ARM64）向け
    platform: linux/arm64
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://hama:hama@db:5432/hama
      - NEXT_PUBLIC_APP_NAME=HAMA
      - NEXT_PUBLIC_DEFAULT_CURRENCY=JPY
      # ── フェーズ2（個人向け認証）追加時に有効化 ──
      # - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      # - CLERK_SECRET_KEY=${CLERK_SECRET_KEY}
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next

  db:
    image: postgres:16-alpine          # Alpine は ARM64 マルチアーキ対応済み
    platform: linux/arm64
    environment:
      POSTGRES_USER: hama
      POSTGRES_PASSWORD: hama
      POSTGRES_DB: hama
    ports:
      - "5432:5432"
    volumes:
      - hama_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hama"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  hama_pgdata:
```

### 8.2 Dockerfile

```dockerfile
# Dockerfile
# node:20-alpine は linux/arm64（Graviton2）対応済み
FROM node:20-alpine AS base

WORKDIR /app

# 依存関係インストール（キャッシュ最適化）
FROM base AS deps
COPY package*.json ./
RUN npm ci

# ビルドステージ
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 本番ランタイム
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

> **ローカルでのARM64ビルド注意**：
> macOS（Apple Silicon）では `docker buildx build --platform linux/arm64` で正しくビルドできる。
> Intel Mac / Windows では `--platform linux/arm64` 指定時にエミュレーション（遅い）が走るが、CI/CD（GitHub Actions + arm64 runner）で対処することを推奨する。

### 8.3 EC2 t4g.small 運用メモ

| 項目 | 内容 |
|---|---|
| インスタンスタイプ | t4g.small（2vCPU / 2GB RAM / Graviton2） |
| アーキテクチャ | ARM64（linux/arm64） |
| OS | Amazon Linux 2023 または Ubuntu 22.04 ARM |
| Docker | Docker Engine 24.x + Compose V2 |
| PostgreSQL | RDS for PostgreSQL（本番）/ コンテナ内（開発） |
| ポート | 3000（アプリ）/ 5432（PostgreSQL） |

---

## 9. 環境変数

```bash
# .env.example

# PostgreSQL
DATABASE_URL=postgresql://hama:hama@localhost:5432/hama

# アプリ設定
NEXT_PUBLIC_APP_NAME=HAMA
NEXT_PUBLIC_DEFAULT_CURRENCY=JPY

# ── フェーズ2（個人向け認証）追加時に有効化 ──
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxx
# CLERK_SECRET_KEY=sk_test_xxxx
# NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
# NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

---

## 10. 拡張性設計指針

### 10.1 カテゴリ・項目の追加
`shared/config/categories.ts` に定義を追加するだけで入力フォーム・チャート・スコア計算に自動反映される設定駆動設計。

```typescript
export const CATEGORIES = {
  happiness: [
    { id: 'hap_time',    label: '時間バランス', type: 'slider', min: 0, max: 100 },
    { id: 'hap_health',  label: '健康',         type: 'slider', min: 0, max: 100 },
    // ← ここに追加するだけでUI・チャートに反映
  ],
  financial: [
    { id: 'fin_assets',  label: '総資産', type: 'currency', unit: 'JPY' },
  ]
}
```

### 10.2 認証ロードマップ

| フェーズ | 認証状態 | 対応内容 |
|---|---|---|
| **MVP** | **認証なし** | 単一ユーザー想定。Profile.userId は null |
| **フェーズ2** | 個人向け認証 | Clerk導入。middleware.ts でルート保護。userId を Profile に紐付け |
| **フェーズ3** | 企業向け拡張 | Clerk Organization。Organization モデル追加。SSO対応 ※計画外 |

フェーズ2移行時の変更コストは最小化済み：
- `Profile.userId` を `nullable → required` に変更
- `middleware.ts` を追加
- `features/auth/` を実装（ディレクトリはMVP時点で作成済み）

### 10.3 フロントエンドサーバーは不要
Next.js 15 App Router が画面（React）と API（API Routes）を1プロセスで統合。
別途 Express・FastAPI などのサーバーを立てる必要はなく、EC2の1コンテナで完結する。

### 10.4 将来のAI連携（Claude API）
- `app/api/advice/route.ts` を追加し、スナップショットデータをコンテキストとして Claude API に送信
- アドバイス結果をダッシュボードのサイドパネルに表示

---

## 11. 開発スライス計画

### 設計思想
- **1スライス = 動く最小単位**。完了時点でアプリが実際に動作すること
- スライスをまたいで壊れた状態を作らない（常にmainブランチは動く）
- 各スライス完了後に **git commit** で記録する
- Copilotへの指示は **1スライスずつ** 行う

### git 運用ルール

```bash
# スライス開始時
git checkout -b slice/S01-project-skeleton

# スライス完了時
git add .
git commit -m "S01: プロジェクト骨格・Docker環境構築"
git checkout main
git merge slice/S01-project-skeleton
```

**コミットメッセージ規則**：`S##: 日本語で何をしたか`

---

### スライス一覧

#### 🏗️ Phase A：骨格

| スライス | 内容 | 完了条件 | gitタグ |
|---|---|---|---|
| **S01** | Next.js 15初期化・TypeScript・Tailwind・Docker Compose（ARM64対応）設定 | `docker compose up` でHello画面が表示される | `S01` |
| **S02** | shadcn/ui導入・グローバルレイアウト・ナビゲーションバー | 全7画面にルーティングで遷移できる（中身は空） | `S02` |
| **S03** | Prisma導入・PostgreSQL接続・DBスキーマ作成・マイグレーション実行 | `/api/health` がDB接続OKを返す | `S03` |

---

#### 📝 Phase B：入力

| スライス | 内容 | 完了条件 | gitタグ |
|---|---|---|---|
| **S04** | Zustandストア設計（profileStore・scenarioStore） | ストアの型定義と初期値が揃っている | `S04` |
| **S05** | ハッピースコア入力UI（スライダー4項目）＋ Zodバリデーション | スライダーを動かすと値がストアに反映される | `S05` |
| **S06** | 財務入力UI（総資産・収入・支出）＋ 万円表示切替 | 数値入力でストアに保存・バリデーションが動く | `S06` |
| **S07** | 入力値をDB（Snapshot）に保存・ページリロードで復元 | リロード後も入力値がDBから復元される | `S07` |

---

#### 📊 Phase C：可視化

| スライス | 内容 | 完了条件 | gitタグ |
|---|---|---|---|
| **S08** | Apache ECharts導入・レーダーチャート（ハードコード値で表示） | チャートが画面に描画される | `S08` |
| **S09** | レーダーチャートをストアのハッピー入力値に接続 | スライダーを動かすとチャートがリアルタイム更新される | `S09` |
| **S10** | HAMAスコア計算ロジック実装・スコア数値表示 | 入力値変化でスコアが計算・表示される | `S10` |
| **S11** | デュアル軸ラインチャート（財務 左Y軸 / ハッピー各項目・HAMAスコア 右Y軸） | 2軸グラフが表示される | `S11` |
| **S12** | ダッシュボード統合（レーダー＋ラインチャート＋スコアを1画面に） | ダッシュボードが完成形のレイアウトで表示される | `S12` |

---

#### 🔁 Phase D：プラン管理
> DBモデルは `Scenario` だが、UX上は「プラン」として扱う。グラフオーバーレイは行わない。

| スライス | 内容 | 完了条件 | gitタグ |
|---|---|---|---|
| **S13** | 時間軸入力（現在・5年後・10年後・20年後）の入力フォーム追加 | 各時点の値を入力・保存できる | `S13` |
| **S14** | プランCRUD（作成・名前変更・削除）UIとDB保存 | 複数プランを作成・切替できる | `S14` |
| **S15** | プラン管理画面にHAMAスコア一覧表示（バー表示） | 全プランのスコアを1画面で比較できる | `S15` |
| **S16** | What-Ifシミュレーション画面（スライダーでリアルタイム影響確認） | 任意項目を動かしてスコア変化を即確認できる | `S16` |

---

#### 🎁 Phase E：仕上げ

| スライス | 内容 | 完了条件 | gitタグ |
|---|---|---|---|
| **S17** | ライフステージ別テンプレート読み込み（4種） | テンプレート選択で入力値が一括セットされる | `S17` |
| **S18** | PDF・PNG エクスポート機能 | ボタン1つでレポートがダウンロードされる | `S18` |
| **S19** | 設定画面（HAMAスコア加重値・目標資産額・表示単位） | 設定変更がスコアとグラフに即反映される | `S19` |
| **S20** | UI磨き・レスポンシブ対応・ダークモード | スマホ・タブレット・PCで崩れなく表示される | `S20` |

---

#### 🏦 Phase F：詳細財務入力（MVPコア完成後）

| スライス | 内容 | 完了条件 | gitタグ |
|---|---|---|---|
| **F01** | DBスキーマ拡張（`FinancialItem`・`FinancialEntry` 追加）・マイグレーション | `/input/detail` ページが空で表示される | `F01` |
| **F02** | 階層型財務項目CRUD（大項目固定・中小項目の追加削除UI） | 項目を追加・削除・並び替えできる | `F02` |
| **F03** | スプレッドシート型グリッドUI（月次36ヶ月列＋年次列）の表示と入力保存 | 月次・年次列に値を入力・`FinancialEntry` に保存できる | `F03` |
| **F04** | 年次入力の月次自動展開ロジック実装 | 年次入力すると12ヶ月分の `FinancialEntry` が自動生成される | `F04` |
| **F05** | 自動計算エンジン（複利・減価償却・CF自動生成）実装 | 利率を設定すると月次値が自動計算・保存される | `F05` |
| **F06** | `financial-aggregator.ts` 実装（月次→4時点動的集約） | 詳細財務の値がダッシュボードのチャートに反映される | `F06` |

---

### Copilotへの指示テンプレート

各スライス開始時に以下の形式でCopilot Chatに貼り付ける：

```
@workspace
PRODUCT.md と ARCHITECTURE.md を参照してください。

## 今回のタスク：S05 - ハッピースコア入力UI

### 実装内容
- features/happiness/components/HappinessSlider.tsx を作成
- ハッピー4項目（時間バランス・健康・人間関係・自己実現）のスライダーUI
- 各スライダーは0〜100、Zustandストアにリアルタイム反映
- Zodバリデーションを使用
- shadcn/ui の Slider コンポーネントを使うこと

### 完了条件
スライダーを動かすと値がZustandストアに反映されること

### 変更してよいファイル
- src/features/happiness/ 配下の新規ファイル
- src/store/profileStore.ts（ハッピー値の追加のみ）

### 変更してはいけないファイル
- src/app/ 配下のルーティング
- prisma/schema.prisma
```

---

*このドキュメントはClaude向けの実装指示書として使用すること。*
*実装開始時は必ず `PRODUCT.md` と本ドキュメントを両方コンテキストに含めること。*
