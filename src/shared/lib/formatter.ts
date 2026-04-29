/**
 * Format a number as Japanese currency (JPY)
 * @param value - The numeric value to format
 * @param unit - Display unit: "circle" (万円) or "yen" (円)
 * @param decimals - Number of decimal places to show
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number,
  unit: "circle" | "yen" = "circle",
  decimals: number = 0
): string {
  if (unit === "circle") {
    // 万円 format
    const circleValue = value / 10000;
    return `${circleValue.toLocaleString("ja-JP", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}万`;
  } else {
    // 円 format
    return `${Math.round(value).toLocaleString("ja-JP")}円`;
  }
}

/**
 * Parse a currency string back to a number
 * @param str - The currency string to parse
 * @returns The numeric value
 */
export function parseCurrency(str: string): number {
  const cleaned = str.replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  if (str.includes("万")) {
    return num * 10000;
  }
  return num;
}

/**
 * Format a number with thousand separators (Japanese locale)
 * @param value - The numeric value to format
 * @returns Formatted string with commas
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return value.toLocaleString("ja-JP", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a date in Japanese locale
 * @param date - The date to format
 * @param format - Format style: "short" | "long"
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  format: "short" | "long" = "short"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (format === "short") {
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } else {
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

/**
 * Format a YearMonth string (YYYY-MM) to Japanese display
 * @param yearMonth - String in format "2026-04"
 * @returns Formatted string like "2026年4月"
 */
export function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  return `${year}年${parseInt(month)}月`;
}
