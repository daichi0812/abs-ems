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
