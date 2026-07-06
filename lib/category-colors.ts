// カテゴリ（Tag）に関する色・アイコンの共通ユーティリティ。
// 実データの色は DB の Tag.color を正とする。ここで扱うのは
// - 新規カテゴリ追加時のカラーパレット（固定の推奨色）
// - 色が未設定・不明なときのフォールバック
// - バッジ等で使う淡色（tint）
// - カテゴリ名からアイコンSVGパスを引く（既知名は専用アイコン、未知名は汎用）

/** カテゴリ追加のカラーピッカーに出す推奨色（UI刷新案のパレット）。 */
export const CATEGORY_PALETTE = [
  "#2E90FA", // ブルー（カメラ）
  "#F79009", // オレンジ（照明）
  "#12B76A", // グリーン（モニター）
  "#7A5AF8", // パープル（音響）
  "#F04438", // レッド（三脚・ジンバル）
  "#667085", // グレー（その他）
  "#0BA5EC", // スカイ
  "#EE46BC", // ピンク
] as const;

/** 色が取れないときのフォールバック（Tag.color の既定にも近い中間グレー）。 */
export const DEFAULT_CATEGORY_COLOR = "#667085";

/**
 * バッジ・タイル背景に使う淡色。デザインは 8bit アルファ 0x1F（約12%）を付与している。
 * `#RRGGBB` 前提。想定外の入力はそのまま返す。
 */
export function tint(hex: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? `${hex}1F` : hex;
}

/**
 * 与えられた色を安全に扱う（未設定なら既定色）。
 */
export function categoryColor(color?: string | null): string {
  return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : DEFAULT_CATEGORY_COLOR;
}

// UI刷新案の CAT_ICON。既知のカテゴリ名にだけ専用アイコンを割り当てる。
const ICON_BY_NAME: Record<string, string> = {
  カメラ:
    "M4 8.5h3l1.5-2h5l1.5 2h3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z M12 16.6a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6z",
  照明:
    "M9.5 17.5h5 M10.5 20.5h3 M12 3a6 6 0 0 0-3.6 10.8c.6.5.9 1 .9 1.7h5.4c0-.7.3-1.2.9-1.7A6 6 0 0 0 12 3z",
  モニター: "M3 5h18a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M9 20h6 M12 16v4",
  音響:
    "M6.5 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M12 15a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z M12 7.4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  "三脚・ジンバル": "M9 5h6v1.6H9z M12 6.6v6.4 M12 13 6.5 20.5 M12 13l5.5 7.5 M12 13v7.5",
  その他:
    "M3.5 8h13a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z M19.5 11.2v3.6 M6.5 11v2 M9.5 11v2 M12.5 11v2",
};

// 未知カテゴリ用の汎用アイコン（箱）。
const FALLBACK_ICON =
  "M3.5 8h13a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z M19.5 11.2v3.6";

/** カテゴリ名に対応するアイコンSVGパス（d 属性）を返す。 */
export function categoryIconPath(name?: string | null): string {
  if (name && ICON_BY_NAME[name]) return ICON_BY_NAME[name];
  return FALLBACK_ICON;
}
