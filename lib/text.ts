// 短い行数で表示する説明文向けのテキスト整形。

/**
 * 改行を空白1つへ畳む。実際の改行(\r\n / \r / \n)に加えて、旧登録フォーム由来で
 * 文字どおりの「\n」(バックスラッシュ+n) が保存されているデータがあるため、両方を対象にする。
 */
export function flattenNewlines(text: string): string {
  return text.replace(/(?:\r\n|[\r\n]|\\n)+/g, " ").trim();
}
