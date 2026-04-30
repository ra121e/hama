/**
 * financial-aggregator.ts
 *
 * Phase F：月次FinancialEntryデータから4時点・年次・月次への動的集約
 *
 * 使用シーン：
 * - ダッシュボードの DualAxisChart：4時点（now, 5y, 10y, 20y）の集約値を表示
 * - 詳細財務グラフ：年次推移グラフ用の年次集約データ
 * - スプレッドシート：直近月次データの表示・編集
 *
 * 集約ルール：
 * - 残高系（資産・負債）：指定時点の月末残高を使用
 * - フロー系（収入・支出）：指定年の12ヶ月合計を使用
 *
 * 時点の計算：
 * - now：現在（yearMonthの最大値を基準）
 * - 5y：60ヶ月後
 * - 10y：120ヶ月後
 * - 20y：240ヶ月後
 */

import type { FinancialEntry } from "@/entities/financial-item";

export type Timepoint = "now" | "5y" | "10y" | "20y";
export type AggregationType = "balance" | "flow";

/**
 * YYYY-MM形式の日付文字列を Date に変換（月初1日として扱う）
 */
function parseYearMonth(yearMonth: string): Date {
  const [year, month] = yearMonth.split("-");
  return new Date(parseInt(year), parseInt(month) - 1, 1);
}

/**
 * Date から YYYY-MM形式の文字列に変換
 */
function formatYearMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * 2つの年月を比較（結果：date1 - date2、単位：ヶ月）
 */
function monthDiff(date1: string, date2: string): number {
  const d1 = parseYearMonth(date1);
  const d2 = parseYearMonth(date2);
  return (d1.getFullYear() - d2.getFullYear()) * 12 + (d1.getMonth() - d2.getMonth());
}

/**
 * 年月に指定ヶ月を加算
 */
function addMonths(yearMonth: string, months: number): string {
  const date = parseYearMonth(yearMonth);
  date.setMonth(date.getMonth() + months);
  return formatYearMonth(date);
}

function buildMonthlyMap(entries: FinancialEntry[]): Map<string, number> {
  return new Map(entries.map((entry) => [entry.yearMonth, entry.value]));
}

function sumMonthlyWindow(
  entries: FinancialEntry[],
  startMonth: string,
  months: number
): {
  sum: number;
  hasAnyData: boolean;
} {
  const monthlyMap = buildMonthlyMap(entries);
  let sum = 0;
  let hasAnyData = false;

  for (let i = 0; i < months; i++) {
    const yearMonth = addMonths(startMonth, i);
    const value = monthlyMap.get(yearMonth);
    if (value !== undefined) {
      sum += value;
      hasAnyData = true;
    }
  }

  return { sum, hasAnyData };
}

/**
 * 指定された時点（now, 5y, 10y, 20y）に対応する月次データを取得
 *
 * 時点計算：
 * - now：baseMonth（データ内の起点月）
 * - 5y：baseMonth + 60ヶ月
 * - 10y：baseMonth + 120ヶ月
 * - 20y：baseMonth + 240ヶ月
 *
 * データが存在しない場合の処理：
 * - フロー系：直近12ヶ月の平均値を返す（将来推定用）
 * - 残高系：最新月の値を使用（延伸）
 *
 * @param entries - FinancialEntry の配列（同一itemIdのもの想定）
 * @param target - 対象時点（"now" | "5y" | "10y" | "20y"）
 * @param type - 集約タイプ（"balance" = 残高系、"flow" = フロー系）
 * @returns 指定時点の集約値。該当データが存在しない場合は推定値を返す
 */
export function aggregateToTimepoint(
  entries: FinancialEntry[],
  target: Timepoint,
  type: AggregationType
): number {
  if (entries.length === 0) {
    return 0;
  }

  // データ内の起点月を基準とする
  // financial-detail の入力は現在月から未来へ並ぶため、
  // 5y / 10y / 20y はこの起点からの相対月数で解釈する。
  const baseMonth = entries.reduce((min, e) => {
    return monthDiff(e.yearMonth, min) < 0 ? e.yearMonth : min;
  }, entries[0].yearMonth);

  // now時点の場合は常に直接計算
  if (target === "now") {
    if (type === "balance") {
      // 残高系：最新月の月末残高を使用
      const entry = entries.find((e) => e.yearMonth === baseMonth);
      return entry ? entry.value : 0;
    } else {
      // フロー系：現在月から将来12ヶ月の合計を使用（Forward 12 Months）
      // 基準月は、データ内の最新月とシステム現在月のうち小さい方（将来にあるデータがあっても現在月から開始する）
      const systemMonth = formatYearMonth(new Date());
      const effectiveBase = monthDiff(baseMonth, systemMonth) > 0 ? systemMonth : baseMonth;

      // フォールバックはデータ内の最新月の値（存在しない場合は平均値）
      const latestEntry = entries.find((e) => e.yearMonth === baseMonth);
      const fallbackMonthly = latestEntry ? latestEntry.value : Math.round(entries.reduce((s, e) => s + e.value, 0) / entries.length);

      let sum = 0;
      for (let i = 0; i < 12; i++) {
        const month = addMonths(effectiveBase, i);
        const entry = entries.find((e) => e.yearMonth === month);
        sum += entry ? entry.value : fallbackMonthly;
      }
      return sum;
    }
  }

  // 対象月の計算
  let targetMonth: string;
  switch (target) {
    case "5y":
      targetMonth = addMonths(baseMonth, 60);
      break;
    case "10y":
      targetMonth = addMonths(baseMonth, 120);
      break;
    case "20y":
      targetMonth = addMonths(baseMonth, 240);
      break;
    default:
      return 0;
  }

  if (type === "balance") {
    // 残高系：
    // - 対象月のデータがあれば使用
    // - なければ、最新月の値を延伸（将来予測）
    const entry = entries.find((e) => e.yearMonth === targetMonth);
    if (entry) {
      return entry.value;
    }

    // 対象月が未来で存在しない場合、最新月の値を使用
    const latestEntry = entries.find((e) => e.yearMonth === baseMonth);
    return latestEntry ? latestEntry.value : 0;
  } else {
    // フロー系：
    // - 対象時点から連続12ヶ月の合計を返す
    // - その窓にデータがない場合のみ、直近12ヶ月の平均を年額換算して返す
    const window = sumMonthlyWindow(entries, targetMonth, 12);

    if (window.hasAnyData) {
      return window.sum;
    }

    const recent12Months = getMonthlyEntries(entries, 12);
    if (recent12Months.length === 0) {
      return 0;
    }

    const avgMonthly = recent12Months.reduce((sum, e) => sum + e.value, 0) / recent12Months.length;
    return Math.round(avgMonthly * 12); // 年額に変換
  }
}

/**
 * FinancialEntry の配列を年次で集約
 *
 * 戻り値形式：
 * {
 *   "2026": { balance: 1000000, flow: 50000 },
 *   "2027": { balance: 1100000, flow: 60000 },
 *   ...
 * }
 *
 * balance：その年の12月末の値（残高系は年末、フロー系は未使用）
 * flow：その年の12ヶ月合計（フロー系用）
 *
 * @param entries - FinancialEntry の配列
 * @returns 年次集約データ
 */
export function aggregateToYearly(
  entries: FinancialEntry[]
): Record<string, { balance: number; flow: number }> {
  const result: Record<string, { balance: number; flow: number }> = {};

  // 年度ごとにグループ化
  const byYear: Record<string, FinancialEntry[]> = {};
  for (const entry of entries) {
    const year = entry.yearMonth.substring(0, 4);
    if (!byYear[year]) {
      byYear[year] = [];
    }
    byYear[year].push(entry);
  }

  // 年度ごとに集約
  for (const [year, yearEntries] of Object.entries(byYear)) {
    // balance：該当年の12月末の値（残高系）
    const decemberEntry = yearEntries.find((e) => e.yearMonth.endsWith("-12"));
    const balance = decemberEntry ? decemberEntry.value : yearEntries[yearEntries.length - 1]?.value ?? 0;

    // flow：該当年の12ヶ月合計（フロー系）
    const flow = yearEntries.reduce((sum, e) => sum + e.value, 0);

    result[year] = { balance, flow };
  }

  return result;
}

/**
 * FinancialEntry の配列から直近N月のデータを取得
 *
 * @param entries - FinancialEntry の配列
 * @param months - 直近何ヶ月か（例：36）
 * @returns 直近N月のデータ（月順でソート）
 */
export function getMonthlyEntries(entries: FinancialEntry[], months: number): FinancialEntry[] {
  if (entries.length === 0) {
    return [];
  }

  // 最新月を基準に直近N月を計算
  const baseMonth = entries.reduce((max, e) => {
    return monthDiff(e.yearMonth, max) > 0 ? e.yearMonth : max;
  }, entries[0].yearMonth);

  const startMonth = addMonths(baseMonth, -months + 1);

  // フィルタリング：開始月以降のデータを取得
  const filtered = entries.filter((e) => {
    return monthDiff(e.yearMonth, startMonth) >= 0;
  });

  // 月順でソート
  return filtered.sort((a, b) => {
    return monthDiff(a.yearMonth, b.yearMonth);
  });
}

/**
 * 月次データのマップを作成（yearMonth → value）
 *
 * @param entries - FinancialEntry の配列
 * @returns 月次データのマップ
 */
export function toMonthlyMap(entries: FinancialEntry[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const entry of entries) {
    result[entry.yearMonth] = entry.value;
  }
  return result;
}

/**
 * 4時点（now, 5y, 10y, 20y）の集約値をまとめて取得
 *
 * @param entries - FinancialEntry の配列
 * @param type - 集約タイプ（"balance" | "flow"）
 * @returns 4時点の集約値オブジェクト
 */
export function aggregateTo4Timepoints(
  entries: FinancialEntry[],
  type: AggregationType
): Record<Timepoint, number> {
  return {
    now: aggregateToTimepoint(entries, "now", type),
    "5y": aggregateToTimepoint(entries, "5y", type),
    "10y": aggregateToTimepoint(entries, "10y", type),
    "20y": aggregateToTimepoint(entries, "20y", type),
  };
}
