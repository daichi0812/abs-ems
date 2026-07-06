// JST（Asia/Tokyo）の「今日」を扱う小さなヘルパー。
// 以前は moment-timezone を使っていたが、用途がこの1パターンだけなのに
// 全タイムゾーンDB（約0.7MB）がサーバーバンドルに同梱されコールドスタートを
// 押し上げていたため、標準の Intl に置き換えた。

/** JST での今日の日付を YYYY-MM-DD で返す（en-CA ロケールは YYYY-MM-DD 形式）。 */
export function todayJstDateString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** JST での今日を UTC 深夜0時の Date として返す（予約日付カラムとの比較用）。 */
export function todayJstAsUtcMidnight(): Date {
  return new Date(`${todayJstDateString()}T00:00:00Z`);
}

// YYYY-MM-DD を UTC 深夜0時の Date として厳密にパースする。
// 正規表現だけだと「2026-13-01」（Invalid Date → Prisma が例外 → 500）や
// 「2026-02-30」（3月2日へ静かに繰り上がる）が素通りするため、
// 逆変換の一致まで確認して暦として実在する日付だけを受け付ける。
export function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || !date.toISOString().startsWith(value)) return null;
  return date;
}
