/**
 * カレンダーイベント表示用の純粋ヘルパー。
 * 背景色に応じたコントラスト文字色の計算。
 */

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
