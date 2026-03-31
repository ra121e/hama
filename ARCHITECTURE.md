# ARCHITECTURE.md — HAMA 技術アーキテクチャ設計書

**製品名**：HAMA（ハマ）— Happy Adviser Money Adviser  
**バージョン**：MVP v1.0  
**最終更新**：2026-03-31

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
| 認証 | **MVP：なし**／ 次フェーズ：Clerk（個人）／ その次：Clerk Organization（企業） | 段階的に追加。MVPでは認証不要 |
| DB | PostgreSQL | マルチユーザー対応・本番環境標準 |
| ORM | Prisma | 直感的なスキーマ定義・マイグレーション自動化・Copilotとの相性◎ |
| ホスティング | Vercel（アプリ）+ Railway（PostgreSQL） | ゼロコンフィグデプロイ・スケールアウト容易 |
| コンテナ | Docker Compose | ローカル開発環境の統一（本番はVercel/Railwayに委ねる） |
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
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # ルートレイアウト（Provider類ラップ）
│   │   ├── page.tsx                # ダッシュボード（/）
│   │   ├── input/
│   │   │   └── page.tsx            # 入力フォーム（/input）
│   │   ├── scenario/
│   │   │   └── page.tsx            # シナリオ管理（/scenario）
│   │   ├── simulation/
│   │   │   └── page.tsx            # What-Ifシミュレーション
│   │   ├── report/
│   │   │   └── page.tsx            # レポート出力
│   │   ├── settings/
│   │   │   └── page.tsx            # 設定画面
│   │   └── api/
│   │       ├── profile/
│   │       │   └── route.ts        # プロファイルCRUD
│   │       └── scenario/
│   │           └── route.ts        # シナリオCRUD
│   │
│   ├── features/                   # ドメイン別機能モジュール
│   │   ├── auth/                   # 【将来：フェーズ2で実装】認証関連（MVP時点は空ディレクトリ）
│   │   │   └── .gitkeep
│   │   ├── financial/
│   │   │   ├── components/         # FinancialInputForm等
│   │   │   ├── hooks/              # useFinancialForm
│   │   │   ├── schema.ts           # Zodスキーマ（財務）
│   │   │   └── types.ts
│   │   ├── happiness/
│   │   │   ├── components/         # HappinessSlider等
│   │   │   ├── hooks/              # useHappinessForm
│   │   │   ├── schema.ts           # Zodスキーマ（ハッピー）
│   │   │   └── types.ts
│   │   ├── scenario/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   ├── charts/
│   │   │   ├── RadarChart.tsx      # レーダーチャート（ECharts）
│   │   │   ├── DualAxisChart.tsx   # デュアル軸ラインチャート（ECharts）
│   │   │   └── HamaScore.tsx       # スコアメーター表示
│   │   └── auth/                   # 【フェーズ2で実装】認証関連
│   │       ├── components/         # SignInButton等（MVP時点では空ディレクトリ）
│   │       └── hooks/              # useCurrentUser等
│   │
│   ├── entities/                   # データエンティティ
│   │   ├── profile.ts              # プロファイル型定義
│   │   └── scenario.ts             # シナリオ型定義
│   │
│   ├── prisma/                     # Prisma関連（srcの外に置くことも可）
│   │   └── schema.prisma           # DBスキーマ定義
│   │
│   ├── shared/                     # 共有ユーティリティ
│   │   ├── components/             # Button, Card, Modal等（shadcn/ui再エクスポート）
│   │   ├── hooks/                  # useDebounce, useLocalStorage等
│   │   ├── lib/
│   │   │   ├── hama-score.ts       # HAMAスコア計算ロジック
│   │   │   ├── normalizer.ts       # 財務値の正規化ユーティリティ
│   │   │   └── formatter.ts        # 通貨フォーマット（万円表示等）
│   │   └── config/
│   │       └── categories.ts       # カテゴリ・項目定義（設定駆動）
│   │
│   └── store/                      # Zustand ストア
│       ├── profileStore.ts         # 現在のプロファイル状態
│       ├── scenarioStore.ts        # シナリオ一覧・選択状態
│       └── uiStore.ts              # UI状態（チャート設定等）
│
├── tests/
│   ├── unit/
│   │   └── hama-score.test.ts
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
ユーザー入力
    │
    ▼
Zodバリデーション（features/financial・happiness/schema.ts）
    │
    ▼
Zustand Store（store/profileStore.ts）
    │
    ├──► HAMAスコア計算（shared/lib/hama-score.ts）
    │         │
    │         ▼
    │    スコア表示（features/charts/HamaScore.tsx）
    │
    └──► EChartsデータ変換
              │
              ├──► RadarChart.tsx（ハッピー軸レーダー）
              └──► DualAxisChart.tsx（財務 左Y軸 / HAMAスコア 右Y軸）
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

スキーマはMVP時点からフェーズ2への移行コストが最小になるよう設計する。
`userId` フィールドはMVPでは `nullable` にしておき、認証追加時に `required` に変更する。

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
// userId は MVP では null、フェーズ2で Clerk の userId を格納
model Profile {
  id        String    @id @default(uuid())
  name      String
  currency  String    @default("JPY")
  userId    String?   // nullable → フェーズ2で String @unique に変更
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  scenarios Scenario[]
  settings  Settings?
}

// シナリオ（プロファイル配下）
model Scenario {
  id        String     @id @default(uuid())
  name      String
  type      String     // base | optimistic | pessimistic | custom
  isDefault Boolean    @default(false)
  createdAt DateTime   @default(now())
  profile   Profile    @relation(fields: [profileId], references: [id], onDelete: Cascade)
  profileId String
  snapshots Snapshot[]
}

// スナップショット（シナリオ × 時点 × 項目の値）
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
  displayUnit     String  @default("man") // 円 | 万円
  profile         Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  profileId       String  @id
}

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
                                              └── Scenario → Snapshot
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
    : 50 // 目標未設定時はニュートラル値
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

## 6. EChartsグラフ設定方針

### 6.1 レーダーチャート
```typescript
// indicator にハッピー4項目を設定（max: 100）
// 財務軸を追加する場合は "正規化した値（0〜100）" で別 indicator として追加
// 複数シナリオ = seriesData を複数設定し、異なる color + opacity で重ねる
```

### 6.2 デュアル軸ラインチャート
```typescript
// yAxis: [
//   { type: 'value', name: '金額（万円）', position: 'left' },         // 左軸：財務
//   { type: 'value', name: 'スコア', min: 0, max: 100, position: 'right' }  // 右軸：ハッピー各項目・HAMAスコア
// ]
//
// 右軸に表示する系列（yAxisIndex: 1）：
//   - ハッピー4項目（時間バランス・健康・人間関係・自己実現）を個別の面グラフで表示（デフォルト）
//   - HAMAスコアを折れ線グラフで表示
//
// 透過度制御：
//   - 各系列の areaStyle.opacity と lineStyle.opacity をUIスライダーと連動
//   - デフォルトは各項目 opacity: 0.3（面）/ 0.8（線）、HAMAスコア opacity: 1.0
//
// 凡例クリック：EChartsのlegendSelectChanged イベントで表示／非表示をトグル
//
// 財務系 series は yAxisIndex: 0、スコア系 series は yAxisIndex: 1 を指定
```

---

## 7. Docker Compose 構成

Docker Composeは**ローカル開発専用**（本番はVercel + Railwayに委ねる）。

```yaml
# docker-compose.yml
version: '3.9'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://hama:hama@db:5432/hama
      - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      - CLERK_SECRET_KEY=${CLERK_SECRET_KEY}
    depends_on:
      - db
    volumes:
      - .:/app
      - /app/node_modules

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: hama
      POSTGRES_PASSWORD: hama
      POSTGRES_DB: hama
    ports:
      - "5432:5432"
    volumes:
      - hama_pgdata:/var/lib/postgresql/data

volumes:
  hama_pgdata:
```

> **起動コマンド**：`docker compose up` — アプリ + PostgreSQL が同時起動。

---

## 8. 環境変数

```bash
# .env.example

# PostgreSQL（ローカル開発）
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

## 9. 拡張性設計指針

### 9.1 カテゴリ・項目の追加
`shared/config/categories.ts` に JSON定義を追加するだけで、入力フォーム・チャート・スコア計算に自動反映される設定駆動設計とする。

```typescript
// shared/config/categories.ts の構造例
export const CATEGORIES = {
  happiness: [
    { id: 'hap_time',     label: '時間バランス', type: 'slider', min: 0, max: 100 },
    { id: 'hap_health',   label: '健康',         type: 'slider', min: 0, max: 100 },
    // ← ここに追加するだけでUI・チャートに反映
  ],
  financial: [
    { id: 'fin_assets',   label: '総資産',   type: 'currency', unit: 'JPY' },
    // ← 同様に追加可能
  ]
}
```

### 9.2 ホスティング構成

```
┌──────────────────┐     ┌──────────────────┐
│   Vercel         │     │   Railway        │
│   （Next.jsアプリ）│────▶│   （PostgreSQL）  │
└──────────────────┘     └──────────────────┘
```

- **Vercel**：Next.jsのゼロコンフィグデプロイ。`git push` でCI/CD自動化
- **Railway**：PostgreSQLをマネージドで提供。`DATABASE_URL` を環境変数に設定するだけ
- 認証SaaS（Clerk等）はフェーズ2以降で追加

### 9.3 認証ロードマップ

| フェーズ | 認証状態 | 対応内容 |
|---|---|---|
| **MVP** | **認証なし** | 単一ユーザー想定。ProfileのuserId は null |
| **フェーズ2** | 個人向け認証 | Clerk導入。middleware.tsでルート保護。userId をProfileに紐付け |
| **フェーズ3** | 企業向け拡張 | Clerk Organization。Organizationモデル追加。SSO対応 ※計画外 |

フェーズ2移行時の変更は最小化するよう設計済み：
- `Profile.userId` を `nullable → required` に変更
- `middleware.ts` を追加
- `features/auth/` を実装（ディレクトリはMVP時点で作成済み）

### 9.4 フロントエンドサーバーは不要
Next.js 15 App Router が画面（React）と API（API Routes）を1プロセスで統合している。
別途 Express・FastAPI などのサーバーを立てる必要はなく、Vercelへのデプロイ1つで完結する。

```
Next.js（Vercelで動作）
  ├── App Router ── 画面・UI（React Server Components）
  └── API Routes ── データ取得・保存エンドポイント
          ↓
      Prisma ORM
          ↓
    PostgreSQL（Railway）
```

### 9.5 将来のAI連携（Claude API）
- `app/api/advice/route.ts` を追加し、スナップショットデータをコンテキストとして Claude API に送信
- アドバイス結果をダッシュボードのサイドパネルに表示

---

## 10. 開発スライス計画

### 設計思想
- **1スライス = 動く最小単位**。スライス完了時点でアプリが実際に動作すること
- スライスをまたいで壊れた状態を作らない（常にmainブランチは動く）
- 各スライス完了後に **git commit** で記録する
- Copilotへの指示は **1スライスずつ** 行う（複数スライスをまとめて依頼しない）

---

### git 運用ルール

```bash
# スライス開始時：作業ブランチを切る
git checkout -b slice/S01-project-skeleton

# スライス完了時：コミットしてmainにマージ
git add .
git commit -m "S01: プロジェクト骨格・Docker環境構築"
git checkout main
git merge slice/S01-project-skeleton
```

**コミットメッセージ規則**：`S##: 日本語で何をしたか`

---

### スライス一覧

#### 🏗️ Phase A：骨格（動く空箱を作る）

| スライス | 内容 | 完了条件 | gitタグ |
|---|---|---|---|
| **S01** | Next.js 15初期化・TypeScript・Tailwind・Docker Compose設定（PostgreSQL含む） | `docker compose up` でHello画面が表示される | `S01` |
| **S02** | shadcn/ui導入・グローバルレイアウト・ナビゲーションバー | 全6画面にルーティングで遷移できる（中身は空） | `S02` |
| **S03** | Prisma導入・PostgreSQL接続・DBスキーマ作成・マイグレーション実行 | `/api/health` がDB接続OKを返す | `S03` |

---

#### 📝 Phase B：入力（データを受け取れるようにする）

| スライス | 内容 | 完了条件 | gitタグ |
|---|---|---|---|
| **S04** | Zustandストア設計（profileStore・scenarioStore） | ストアの型定義と初期値が揃っている | `S04` |
| **S05** | ハッピースコア入力UI（スライダー4項目） + Zodバリデーション | スライダーを動かすと値がストアに反映される | `S05` |
| **S06** | 財務入力UI（総資産・収入・支出）+ 万円表示切替 | 数値入力でストアに保存・バリデーションが動く | `S06` |
| **S07** | 入力値をDB（Snapshot）に保存・ページリロードで復元 | リロード後も入力値がDBから復元される | `S07` |

---

#### 📊 Phase C：可視化（データをグラフに映す）

| スライス | 内容 | 完了条件 | gitタグ |
|---|---|---|---|
| **S08** | Apache ECharts導入・レーダーチャート（ハードコード値で表示） | チャートが画面に描画される | `S08` |
| **S09** | レーダーチャートをストアのハッピー入力値に接続 | スライダーを動かすとチャートがリアルタイム更新される | `S09` |
| **S10** | HAMAスコア計算ロジック実装・スコア数値表示 | 入力値変化でスコアが計算・表示される | `S10` |
| **S11** | デュアル軸ラインチャート（財務 左Y軸 / HAMAスコア 右Y軸） | 財務値とスコアが同一グラフに2軸で表示される | `S11` |
| **S12** | ダッシュボード画面の統合（レーダー＋ラインチャート＋スコアを1画面に） | ダッシュボードが完成形のレイアウトで表示される | `S12` |

---

#### 🔁 Phase D：シナリオ（複数の未来を比較できるようにする）

| スライス | 内容 | 完了条件 | gitタグ |
|---|---|---|---|
| **S13** | 時間軸入力（現在・5年後・10年後・20年後）の入力フォーム追加 | 各時点の値を入力・保存できる | `S13` |
| **S14** | シナリオCRUD（作成・名前変更・削除）UIとDB保存 | 複数シナリオを作成・切替できる | `S14` |
| **S15** | 複数シナリオのチャートオーバーレイ表示 | レーダー・ラインチャートに複数シナリオが重なって表示される | `S15` |
| **S16** | What-Ifシミュレーション画面（スライダーでリアルタイム影響確認） | 任意項目を動かしてスコア変化を即確認できる | `S16` |

---

#### 🎁 Phase E：仕上げ（使いやすくする）

| スライス | 内容 | 完了条件 | gitタグ |
|---|---|---|---|
| **S17** | ライフステージ別テンプレート読み込み（4種） | テンプレート選択で入力値が一括セットされる | `S17` |
| **S18** | PDF・PNG エクスポート機能 | ボタン1つでレポートがダウンロードされる | `S18` |
| **S19** | 設定画面（HAMAスコア加重値・目標資産額・表示単位） | 設定変更がスコアとグラフに即反映される | `S19` |
| **S20** | UI磨き・レスポンシブ対応・ダークモード | スマホ・タブレット・PCで崩れなく表示される | `S20` |

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
- src/entities/db/schema.ts
```

---

*このドキュメントはClaude向けの実装指示書として使用すること。*  
*実装開始時は必ず `PRODUCT.md` と本ドキュメントを両方コンテキストに含めること。*
