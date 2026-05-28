# ARCHITECTURE.md — HAMA 技術アーキテクチャ設計書

**製品名**：HAMA（ハマ）— Happy Adviser Money Adviser
**バージョン**：MVP v1.0 / Phase F〜H 設計含む
**最終更新**：2026-05-28

---

## 1. 技術スタック

| レイヤー | 技術 | 選定理由 |
|---|---|---|
| フレームワーク | Next.js 15 (App Router) | SSR/CSR統合・APIルート内蔵 |
| 言語 | TypeScript 5.x | 型安全・スキーマ駆動開発に必須 |
| スタイリング | Tailwind CSS v4 + shadcn/ui | 高速UI構築・アクセシブルコンポーネント |
| グラフ | Apache ECharts 5.x | デュアル軸・複数シリーズ・レーダーを公式サポート |
| 状態管理 | Zustand | 軽量・シンプル・Next.js App Routerと相性良好 |
| バリデーション | Zod | スキーマ定義をフロント/バックエンドで共有 |
| 認証 | **Phase G完了まで：なし** → **Phase H：Better-Auth**（自己ホスト型） → フェーズ3：Organization拡張 | SaaS非依存・自己ホスト・Prisma統合容易 |
| DB | PostgreSQL | マルチユーザー対応・本番環境標準 |
| ORM | Prisma | 直感的なスキーマ定義・マイグレーション自動化 |
| グリッドUI（Phase F） | ag-Grid または TanStack Table | 仮想スクロール・階層行・大量月次データに対応 |
| ゲートウェイ（Phase G） | **Caddy 2.x** | 自動HTTPS（Let's Encrypt）・シンプルなCaddyfile設定 |
| CI/CD（Phase G） | **GitHub Actions** | ARM64 buildx・EC2 SSH deploy・PR自動テスト |
| コードレビュー（Phase G） | **Brook-lint** | skill.md群を知識源としたAIコードレビュー自動化 |
| ホスティング | EC2 t4g.small（ARM64 / Graviton2） | コスト効率・Graviton2で性能/コストバランス良好 |
| コンテナ | Docker Compose（ARM64対応） | ローカル開発環境の統一 |
| テスト | Vitest + Testing Library | 高速・Vite互換・shadcn UIと相性良好 |

---

## 2. ディレクトリ構造

Feature Sliced Design（FSD）準拠。

```
hama/
├── docker-compose.yml
├── docker-compose.prod.yml         # 本番用（Caddy含む）
├── Dockerfile
├── Caddyfile                       # 【Phase G】Caddy設定（HTTPS・リバースプロキシ）
├── .env.example
│
├── .github/
│   └── workflows/
│       ├── ci.yml                  # 【Phase G】CI：lint・typecheck・test（PR時）
│       ├── cd.yml                  # 【Phase G】CD：Docker build + EC2デプロイ（main push時）
│       └── review.yml              # 【Phase G】Brook-lint：AIコードレビュー（PR時）
│
├── .brook-lint/
│   ├── config.yml                  # 【Phase G】Brook-lint設定
│   └── skills/                     # レビュー知識源となるskill.mdファイル群
│       ├── nextjs.md
│       ├── prisma.md
│       ├── typescript.md
│       └── ...
│
├── prisma/
│   └── schema.prisma               # DBスキーマ定義
│
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                # ダッシュボード（/）ハッピースコア入力のみ
│   │   ├── input/
│   │   │   ├── page.tsx            # 財務MVP入力（/input）
│   │   │   └── detail/
│   │   │       └── page.tsx        # 詳細財務入力（/input/detail）Phase F実装済み
│   │   ├── scenario/
│   │   │   └── page.tsx
│   │   ├── simulation/
│   │   │   └── page.tsx
│   │   ├── report/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   ├── sign-in/
│   │   │   └── page.tsx            # 【Phase H】サインイン画面
│   │   ├── sign-up/
│   │   │   └── page.tsx            # 【Phase H】サインアップ画面
│   │   └── api/
│   │       ├── health/
│   │       │   └── route.ts
│   │       ├── auth/
│   │       │   └── [...all]/
│   │       │       └── route.ts    # 【Phase H】Better-Auth ハンドラー
│   │       ├── profile/
│   │       │   └── route.ts
│   │       ├── scenario/
│   │       │   └── route.ts
│   │       └── financial-entries/
│   │           └── route.ts
│   │
│   ├── features/
│   │   ├── auth/                   # 【Phase H】Better-Auth クライアント側
│   │   │   ├── components/         # SignInForm・SignUpForm・UserMenu等
│   │   │   ├── hooks/              # useSession・useCurrentUser等
│   │   │   ├── auth.ts             # Better-Auth サーバー設定
│   │   │   ├── auth-client.ts      # Better-Auth クライアント設定
│   │   │   └── .gitkeep            # Phase G完了まで空ディレクトリ
│   │   ├── financial/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── schema.ts
│   │   │   └── types.ts
│   │   ├── financial-detail/       # Phase F実装済み
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── engine/
│   │   │   ├── schema.ts
│   │   │   └── types.ts
│   │   ├── happiness/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── schema.ts
│   │   │   └── types.ts
│   │   ├── scenario/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   └── charts/
│   │       ├── RadarChart.tsx
│   │       ├── DualAxisChart.tsx
│   │       └── HamaScore.tsx
│   │
│   ├── entities/
│   │   ├── profile.ts
│   │   ├── scenario.ts
│   │   └── financial-item.ts
│   │
│   ├── shared/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── hama-score.ts
│   │   │   ├── normalizer.ts
│   │   │   ├── formatter.ts
│   │   │   └── financial-aggregator.ts
│   │   └── config/
│   │       └── categories.ts
│   │
│   └── store/
│       ├── profileStore.ts
│       ├── scenarioStore.ts
│       └── uiStore.ts
│
├── middleware.ts                   # 【Phase H】ルート保護（Better-Auth セッション検証）
│
├── tests/
│   ├── unit/
│   │   ├── hama-score.test.ts
│   │   └── financial-aggregator.test.ts
│   └── integration/
│       └── api.test.ts
│
└── public/
    └── templates/
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

【詳細財務入力ページ（/input/detail）— Phase F実装済み】
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

【リクエスト処理（Phase G以降）】
  ブラウザ → Caddy（HTTPS終端・リバースプロキシ）→ Next.js
              │
              └── Phase H以降：middleware.ts でセッション検証
                    認証済み → 通常処理
                    未認証  → /sign-in へリダイレクト
```

---

## 4. DBスキーマ設計（Prisma）

### 認証ロードマップとスキーマ方針

```
S01〜F06    認証なし。Profileを直接作成・操作（単一ユーザー想定）
     ↓
Phase G     インフラ整備（認証なしのまま）
     ↓
Phase H     Better-Auth導入。User/Session/Account テーブル追加。
            Profile.userId を required に変更
     ↓
フェーズ3   Better-Auth Organizationプラグイン。
            Organization テーブル追加 ※計画外
```

`userId` フィールドはPhase G完了まで `nullable` にしておき、Phase H移行時に `required` に変更する。

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
// MVP〜Phase G スコープ（現在の実装範囲）
// ========================================

model Profile {
  id        String     @id @default(uuid())
  name      String
  currency  String     @default("JPY")
  userId    String?    // nullable → Phase H で String @unique に変更
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  scenarios Scenario[]
  settings  Settings?
}

// プラン（UX上は「名前付きプラン」。DBモデル名は Scenario のまま維持）
model Scenario {
  id        String     @id @default(uuid())
  name      String
  type      String     // default | custom
  isDefault Boolean    @default(false)
  createdAt DateTime   @default(now())
  profile   Profile    @relation(fields: [profileId], references: [id], onDelete: Cascade)
  profileId String
  snapshots Snapshot[]
}

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

model Settings {
  weightHappiness Float   @default(0.7)
  weightFinance   Float   @default(0.3)
  targetAssets    Float?
  displayUnit     String  @default("man")
  profile         Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  profileId       String  @id
}

// ========================================
// Phase F（実装済み）
// ========================================

model FinancialItem {
  id         String   @id @default(uuid())
  profileId  String
  profile    Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  level      String   // large | medium | small
  parentId   String?
  name       String
  category   String   // income | expense | asset | liability
  autoCalc   String   @default("none")  // none | compound | depreciation | cashflow
  rate       Float?
  sortOrder  Int      @default(0)
}

model FinancialEntry {
  id         String   @id @default(uuid())
  scenarioId String
  scenario   Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
  itemId     String
  yearMonth  String   // "2026-04" 形式（常に月次単位）
  value      Float
  isExpanded Boolean  @default(false)  // 年次入力から自動展開された場合 true
  memo       String?
}

// ========================================
// Phase H以降（Better-Auth 導入時に有効化）
// ========================================
// Better-Auth が自動管理するテーブル群（prisma generate で生成）
//
// model User {
//   id            String    @id
//   name          String
//   email         String    @unique
//   emailVerified Boolean
//   image         String?
//   createdAt     DateTime
//   updatedAt     DateTime
//   sessions      Session[]
//   accounts      Account[]
//   profiles      Profile[]  // Profile.userId とのリレーション
// }
//
// model Session {
//   id        String   @id
//   expiresAt DateTime
//   token     String   @unique
//   ipAddress String?
//   userAgent String?
//   userId    String
//   user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
//   createdAt DateTime
//   updatedAt DateTime
// }
//
// model Account {
//   id                    String    @id
//   accountId             String
//   providerId            String
//   userId                String
//   user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
//   accessToken           String?
//   refreshToken          String?
//   idToken               String?
//   accessTokenExpiresAt  DateTime?
//   refreshTokenExpiresAt DateTime?
//   scope                 String?
//   password              String?
//   createdAt             DateTime
//   updatedAt             DateTime
// }
//
// model Verification {
//   id         String   @id
//   identifier String
//   value      String
//   expiresAt  DateTime
//   createdAt  DateTime?
//   updatedAt  DateTime?
// }

// ========================================
// フェーズ3以降（企業向け拡張時に有効化）
// ========================================
// Better-Auth Organization プラグインが管理するテーブル群
//
// model Organization {
//   id        String   @id
//   name      String
//   slug      String?  @unique
//   logo      String?
//   createdAt DateTime
//   metadata  String?
//   members   Member[]
// }
//
// model Member {
//   id             String       @id
//   organizationId String
//   organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
//   userId         String
//   role           String
//   createdAt      DateTime
// }
```

**データの将来階層（設計上の見通し）：**
```
[フェーズ3] Organization
               └── [Phase H] User（Better-Auth管理）
                                 └── [MVP〜] Profile
                                              └── Scenario
                                                    ├── Snapshot
                                                    └── FinancialEntry（Phase F）
```

**主要コマンド：**
```bash
npx prisma migrate dev --name init   # マイグレーション作成・適用
npx prisma generate                  # Prisma Clientを生成
npx prisma studio                    # ブラウザでDB確認
```

---

## 5. HAMAスコア計算ロジック

```typescript
// shared/lib/hama-score.ts

function calcFinanceScore(financial: FinancialData, settings: Settings): number {
  const cashflowRatio = Math.max(0, (financial.income - financial.expense) / financial.income) * 100
  const assetRatio = settings.targetAssets > 0
    ? Math.min(100, (financial.assets / settings.targetAssets) * 100)
    : 50
  return (cashflowRatio + assetRatio) / 2
}

function calcHappinessScore(happiness: HappinessData): number {
  const values = Object.values(happiness)
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export function calcHamaScore(data: SnapshotData, settings: Settings): number {
  const finScore = calcFinanceScore(data.financial, settings)
  const hapScore = calcHappinessScore(data.happiness)
  return (hapScore * settings.weightHappiness) + (finScore * settings.weightFinance)
}
```

---

## 6. Phase F：financial-aggregator.ts 設計（実装済み）

集約は「保存時」ではなく**「表示リクエスト時」に動的に行う**。

```typescript
// shared/lib/financial-aggregator.ts

type AggregateTarget = 'now' | '5y' | '10y' | '20y'
type AggregateType   = 'balance' | 'flow'

export function aggregateToTimepoint(
  entries: FinancialEntry[],
  target: AggregateTarget,
  type: AggregateType,
  baseDate: Date
): number { ... }

export function aggregateToYearly(
  entries: FinancialEntry[],
  type: AggregateType
): Record<string, number> { ... }

export function getMonthlyEntries(
  entries: FinancialEntry[],
  months: number = 36
): FinancialEntry[] { ... }
```

---

## 7. EChartsグラフ設定方針

### 7.1 レーダーチャート
```typescript
// 選択中の1プランのデータのみを seriesData に設定（グラフオーバーレイは行わない）
// 時点切替はseries.dataを差し替えてアニメーション遷移
```

### 7.2 デュアル軸ラインチャート
```typescript
// yAxis: [
//   { type: 'value', name: '金額（万円）', position: 'left' },
//   { type: 'value', name: 'スコア', min: 0, max: 100, position: 'right' }
// ]
// 右軸：ハッピー4項目（面グラフ）+ HAMAスコア（折れ線）
// 透過度制御：areaStyle.opacity / lineStyle.opacity をUIスライダーと連動
// Phase F完了後：X軸を月次に拡張し financial-aggregator.ts の集約値を使用
```

---

## 8. Phase G：Caddy設定（HTTPS・リバースプロキシ）

### 8.1 Caddyfile

```caddyfile
# Caddyfile
{
  # Let's Encryptによる自動HTTPS
  email admin@example.com
}

hama.example.com {
  # Next.jsアプリへのリバースプロキシ
  reverse_proxy app:3000

  # セキュリティヘッダー
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    X-Content-Type-Options "nosniff"
    X-Frame-Options "DENY"
    Referrer-Policy "strict-origin-when-cross-origin"
  }

  # ヘルスチェックエンドポイントはそのまま通す
  handle /api/health {
    reverse_proxy app:3000
  }
}

# ローカル開発用（HTTPSなし）
:80 {
  reverse_proxy app:3000
}
```

### 8.2 docker-compose.prod.yml（本番用・Caddy含む）

```yaml
# docker-compose.prod.yml
version: '3.9'
services:
  caddy:
    image: caddy:2-alpine
    platform: linux/arm64
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data       # TLS証明書の永続化
      - caddy_config:/config
    depends_on:
      app:
        condition: service_healthy
    restart: unless-stopped

  app:
    build:
      context: .
      platforms:
        - linux/arm64
    platform: linux/arm64
    expose:
      - "3000"               # Caddyからのみアクセス（外部公開しない）
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NEXT_PUBLIC_APP_NAME=HAMA
      - NEXT_PUBLIC_DEFAULT_CURRENCY=JPY
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - BETTER_AUTH_URL=${BETTER_AUTH_URL}
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3000/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    platform: linux/arm64
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - hama_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  hama_pgdata:
  caddy_data:
  caddy_config:
```

### 8.3 docker-compose.yml（ローカル開発用・変更なし）

```yaml
# docker-compose.yml（開発環境：Caddyなし・HTTPのまま）
version: '3.9'
services:
  app:
    build:
      context: .
      platforms:
        - linux/arm64
    platform: linux/arm64
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://hama:hama@db:5432/hama
      - NEXT_PUBLIC_APP_NAME=HAMA
      - NEXT_PUBLIC_DEFAULT_CURRENCY=JPY
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next

  db:
    image: postgres:16-alpine
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

---

## 9. Phase G：GitHub Actions CI/CD

### 9.1 CI ワークフロー（ci.yml）

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: TypeScript 型チェック
        run: npm run typecheck

      - name: ESLint
        run: npm run lint

      - name: Vitest 単体テスト
        run: npm run test

      - name: Prisma スキーマ検証
        run: npx prisma validate
```

### 9.2 CD ワークフロー（cd.yml）

```yaml
# .github/workflows/cd.yml
name: CD

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up QEMU（ARM64エミュレーション）
        uses: docker/setup-qemu-action@v3
        with:
          platforms: arm64

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Docker イメージビルド（linux/arm64）
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/arm64
          push: false
          tags: hama:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
          outputs: type=docker,dest=/tmp/hama.tar

      - name: EC2へイメージ転送・デプロイ
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            docker load < /tmp/hama.tar
            cd /opt/hama
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d --no-deps app
            docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

**GitHub Secrets の設定（EC2デプロイ用）：**

| Secret名 | 内容 |
|---|---|
| `EC2_HOST` | EC2のパブリックIPまたはドメイン |
| `EC2_USER` | SSHユーザー名（`ec2-user` 等） |
| `EC2_SSH_KEY` | EC2接続用SSHプライベートキー |
| `BETTER_AUTH_SECRET` | Better-Authのシークレットキー |
| `BETTER_AUTH_URL` | 本番URL（`https://hama.example.com`） |

---

## 10. Phase G：Brook-lint（skill.md群によるAIコードレビュー）

### 10.1 概要

Brook-lintはPRに対してskill.mdファイル群を知識源として活用し、プロジェクト固有のコーディング規約・アーキテクチャ方針に基づいたAIコードレビューを自動実行するツール。

### 10.2 設定ファイル（.brook-lint/config.yml）

```yaml
# .brook-lint/config.yml
version: 1

# レビューの知識源となるskill.mdファイルの参照パス
skills:
  - .brook-lint/skills/nextjs.md
  - .brook-lint/skills/prisma.md
  - .brook-lint/skills/typescript.md
  - .brook-lint/skills/react-patterns.md
  - .brook-lint/skills/hama-conventions.md   # プロジェクト固有の規約

# レビュー対象ファイルのパターン
include:
  - "src/**/*.ts"
  - "src/**/*.tsx"
  - "prisma/schema.prisma"

exclude:
  - "src/**/*.test.ts"
  - "src/**/*.spec.ts"
  - "node_modules/**"

# レビュー観点
review_focus:
  - アーキテクチャ方針（FSD準拠・レイヤー分離）
  - 型安全性（anyの禁止・Zod整合性）
  - Prismaスキーマ変更の影響
  - HAMAスコア計算ロジックの正確性
  - Phase設計との整合性
```

### 10.3 GitHub Actionsワークフロー（review.yml）

```yaml
# .github/workflows/review.yml
name: Brook-lint Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Brook-lint AIコードレビュー
        uses: brook-lint/action@v1
        with:
          config: .brook-lint/config.yml
          github-token: ${{ secrets.GITHUB_TOKEN }}
          # PRのdiffのみを対象にレビュー
          diff-only: true
```

### 10.4 .brook-lint/skills/hama-conventions.md の記載内容

```markdown
# HAMA プロジェクト固有のコーディング規約

## アーキテクチャ
- Feature Sliced Design（FSD）準拠。features/ 配下はドメイン別に分割すること
- shared/ には特定ドメインに依存しないユーティリティのみ配置すること
- Zustand ストアをまたいだ直接参照は禁止（必ずAPIルート経由でDB保存）

## 財務計算
- 財務値の計算はすべて shared/lib/ に集約すること
- 月次集約は financial-aggregator.ts を使用し、コンポーネント内で直接計算しないこと
- HAMAスコアの加重値変更は Settings モデル経由のみ許可

## DBアクセス
- Prismaクライアントの直接呼び出しはAPIルート（app/api/）のみ許可
- トランザクションが必要な複数テーブル操作は prisma.$transaction() を使用すること

## 型定義
- any の使用は禁止。unknown を使用して型を絞り込むこと
- Prismaの自動生成型を直接 props に使用しないこと（entities/ で型エイリアスを定義）
```

---

## 11. Phase H：Better-Auth 認証設計

### 11.1 Better-Auth の概要と選定理由

| 項目 | 内容 |
|---|---|
| 種別 | 自己ホスト型オープンソース認証ライブラリ |
| SaaS依存 | なし（Clerkと異なりデータが自社DBに保存される） |
| Prisma統合 | アダプター提供・テーブル自動生成 |
| 対応認証方式 | メール+パスワード・OAuth（Google/GitHub等）・マジックリンク |
| 将来の拡張 | Organizationプラグインで企業向けマルチテナントに対応可能 |

### 11.2 サーバー設定（features/auth/auth.ts）

```typescript
// src/features/auth/auth.ts
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '@/shared/lib/prisma'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql'
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false  // MVP段階はメール確認不要
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    }
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,     // 7日
    updateAge: 60 * 60 * 24          // 1日ごとにセッション更新
  }
})
```

### 11.3 APIルート（app/api/auth/[...all]/route.ts）

```typescript
// src/app/api/auth/[...all]/route.ts
import { auth } from '@/features/auth/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
```

### 11.4 クライアント設定（features/auth/auth-client.ts）

```typescript
// src/features/auth/auth-client.ts
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL
})

export const { signIn, signOut, signUp, useSession } = authClient
```

### 11.5 middleware.ts によるルート保護

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { betterFetch } from '@better-fetch/fetch'

const PUBLIC_ROUTES = ['/sign-in', '/sign-up', '/api/auth']

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // パブリックルートはそのまま通す
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // セッション検証
  const { data: session } = await betterFetch('/api/auth/get-session', {
    baseURL: request.nextUrl.origin,
    headers: { cookie: request.headers.get('cookie') ?? '' }
  })

  if (!session) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
```

---

## 12. Docker Compose 構成（開発・本番）

### 12.1 Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

> `node:20-alpine` は linux/arm64（Graviton2）対応済み。

### 12.2 EC2 t4g.small 運用メモ

| 項目 | 内容 |
|---|---|
| インスタンスタイプ | t4g.small（2vCPU / 2GB RAM / Graviton2） |
| アーキテクチャ | ARM64（linux/arm64） |
| OS | Amazon Linux 2023 または Ubuntu 22.04 ARM |
| Docker | Docker Engine 24.x + Compose V2 |
| PostgreSQL | RDS for PostgreSQL（本番推奨）/ コンテナ内（開発） |
| ポート公開 | 80・443（Caddy）のみ。3000は外部非公開 |

---

## 13. 環境変数

```bash
# .env.example

# PostgreSQL
DATABASE_URL=postgresql://hama:hama@localhost:5432/hama

# アプリ設定
NEXT_PUBLIC_APP_NAME=HAMA
NEXT_PUBLIC_DEFAULT_CURRENCY=JPY
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Phase H（Better-Auth）追加時に有効化 ──
# BETTER_AUTH_SECRET=your-secret-key-min-32-chars
# BETTER_AUTH_URL=https://hama.example.com
# GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
# GOOGLE_CLIENT_SECRET=xxxx

# ── 本番環境（Caddy・EC2）──
# POSTGRES_USER=hama
# POSTGRES_PASSWORD=your-secure-password
# POSTGRES_DB=hama
```

---

## 14. 拡張性設計指針

### 14.1 認証ロードマップ

| フェーズ | 認証状態 | 対応内容 |
|---|---|---|
| **S01〜F06（完了済み）** | **認証なし** | 単一ユーザー想定。Profile.userId は null |
| **Phase G** | **認証なし**（インフラ整備のみ） | Caddy・CI/CD・Brook-lint導入 |
| **Phase H** | **Better-Auth 個人認証** | メール+パスワード・OAuth。userId を Profile に紐付け |
| **フェーズ3** | **企業向け拡張** | Better-Auth Organizationプラグイン。SSO対応 ※計画外 |

Phase H移行時の変更コストは最小化済み：
- `Profile.userId` を `nullable → required` に変更（マイグレーション1本）
- `middleware.ts` を追加（新規ファイル）
- `features/auth/` を実装（ディレクトリはMVP時点で作成済み）
- Better-Auth テーブル群を Prisma スキーマに追加（コメントアウト済み）

### 14.2 フロントエンドサーバーは不要
Next.js 15 App Router が画面と APIを1プロセスで統合。
Caddy → Next.js の2コンテナ構成で本番運用が完結する。

### 14.3 将来のAI連携（Claude API）
- `app/api/advice/route.ts` を追加し、スナップショットデータをコンテキストとして Claude API に送信
- アドバイス結果をダッシュボードのサイドパネルに表示

---

## 15. 開発スライス計画

### 設計思想
- **1スライス = 動く最小単位**。完了時点でアプリが実際に動作すること
- スライスをまたいで壊れた状態を作らない（常にmainブランチは動く）
- 各スライス完了後に **git commit** で記録する
- Copilotへの指示は **1スライスずつ** 行う

### git 運用ルール

```bash
git checkout -b slice/G01-caddy-https
git add .
git commit -m "G01: Caddy導入・HTTPS設定"
git checkout main
git merge slice/G01-caddy-https
```

**コミットメッセージ規則**：`[フェーズ記号][番号]: 日本語で何をしたか`

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

#### 🌐 Phase G：インフラ整備（F06完了後に着手）

**目標**：本番稼働できるインフラを整える。認証は追加しない。

| スライス | 内容 | 完了条件 | gitタグ |
|---|---|---|---|
| **G01** | `Caddyfile` 作成・`docker-compose.prod.yml` にCaddyサービス追加・ローカルHTTPS動作確認 | `https://localhost` でHAMAが表示される | `G01` |
| **G02** | GitHub Actions CI ワークフロー（`ci.yml`）作成：typecheck・lint・Vitest・Prisma validate | PRを作成するとCIが自動実行され全ステップがpassする | `G02` |
| **G03** | GitHub Actions CD ワークフロー（`cd.yml`）作成：ARM64 Docker buildx・EC2 SSH デプロイ | mainへのpushでEC2に自動デプロイされHTTPSで動作する | `G03` |
| **G04** | Brook-lint セットアップ：`.brook-lint/config.yml`・skill.mdファイル群の作成・`review.yml` ワークフロー追加 | PRにBrook-lintのAIレビューコメントが自動投稿される | `G04` |

---

#### 🔐 Phase H：認証（Phase G完了後に着手）

**目標**：Better-Authによる個人向け認証を追加し、ユーザーごとにデータを分離する。

| スライス | 内容 | 完了条件 | gitタグ |
|---|---|---|---|
| **H01** | Better-Auth インストール・`features/auth/auth.ts` 作成・Prismaスキーマに User/Session/Account/Verification テーブル追加・マイグレーション実行 | `npx prisma migrate dev` が通り、4テーブルがDBに作成される | `H01` |
| **H02** | Better-Auth APIルート（`/api/auth/[...all]/route.ts`）追加・メール+パスワード認証の動作確認 | `POST /api/auth/sign-up/email` でユーザー登録できる | `H02` |
| **H03** | サインイン画面（`/sign-in`）・サインアップ画面（`/sign-up`）のUI実装 | ブラウザからユーザー登録・ログイン・ログアウトができる | `H03` |
| **H04** | `middleware.ts` 追加によるルート保護・未認証時の `/sign-in` リダイレクト | 未ログイン状態でダッシュボードにアクセスするとサインイン画面にリダイレクトされる | `H04` |
| **H05** | `Profile.userId` を `required` に変更・マイグレーション・サインアップ時にProfileを自動作成するロジック追加 | 新規ユーザー登録後、自動でデフォルトProfileが作成されダッシュボードが表示される | `H05` |
| **H06** | 既存データ移行スクリプト作成（userId=nullのProfileに仮ユーザーを割り当て）・動作確認 | Phase G以前に作成したデータが認証後も参照できる | `H06` |
| **H07** | OAuth追加（Google）・ソーシャルログインボタンのUI実装 | Googleアカウントでログイン・ユーザー情報取得ができる | `H07` |
| **H08** | Caddy設定更新・Better-Auth URLをHTTPS本番URLに変更・EC2本番動作確認 | 本番環境でHTTPS認証が正常動作する | `H08` |

---

### Copilotへの指示テンプレート

```
@workspace
PRODUCT.md と ARCHITECTURE.md を参照してください。

## 今回のタスク：G01 - Caddy導入・HTTPS設定

### 実装内容
- Caddyfile を新規作成（ローカル開発用：:80 → app:3000 プロキシ）
- docker-compose.prod.yml を新規作成（Caddy + app + db の3サービス構成）
- docker-compose.yml はローカル開発用のまま変更しない
- ARCHITECTURE.md の 8.1〜8.2 の設定を参考にすること

### 完了条件
`docker compose -f docker-compose.prod.yml up` でCaddy経由でHAMAが表示されること

### 変更してよいファイル
- Caddyfile（新規）
- docker-compose.prod.yml（新規）

### 変更してはいけないファイル
- docker-compose.yml（開発用・変更禁止）
- src/ 配下のすべてのファイル
- prisma/schema.prisma
```

---

*このドキュメントはClaude向けの実装指示書として使用すること。*
*実装開始時は必ず `PRODUCT.md` と本ドキュメントを両方コンテキストに含めること。*
