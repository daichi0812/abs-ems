/**
 * カレンダーイベント表示用の純粋ヘルパー。
 * MM月DD日 形式の日付フォーマットと、背景色に応じたコントラスト文字色の計算。
 */

export const formatDate1 = (date: Date | string): string => {
  const d = new Date(date);
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${month}月${day}日`;
};

export const formatDate2 = (date: Date | string): string => {
  const d = new Date(date);
  d.setDate(d.getDate() - 1); // Date演算で引くことで月初・年初でも正しく繰り下がる
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${month}月${day}日`;
};

/**
 * 背景色 (#RRGGBB) の明るさを計算し、白か黒のどちらが読みやすいかを返す。
 * 旧式の YIQ ベース brightness 計算。
 */
export const getTextColorForBackground = (bgColor: string): string => {
  const hex = bgColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128 ? "#ffffff" : "#000000";
};
