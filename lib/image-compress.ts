// アップロード前にブラウザ側で画像を縮小・再エンコードする。
// スマホ写真（3〜8MBが普通）を無加工で R2 に置くと、全部員が 52px のサムネイル表示の
// ために原寸をダウンロードすることになる。一覧表示には長辺 1600px あれば十分。
//
// fail-open 設計: 変換できない環境・入力では原本をそのまま返し、アップロード自体は
// 止めない（圧縮は最適化であって前提条件ではない）。

const RECOMPRESS_THRESHOLD_BYTES = 300 * 1024; // これ以下は十分軽いのでそのまま
const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.85;

export interface CompressImageOptions {
  /** 長辺の上限（px）。アバターなど小さい表示しかしない用途で下げる */
  maxEdgePx?: number;
  /** このサイズ以下は再圧縮しない（既定 300KB）。小さい表示用途では下げる */
  recompressThresholdBytes?: number;
}

export async function compressImage(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  const maxEdgePx = options.maxEdgePx ?? MAX_EDGE_PX;
  const recompressThresholdBytes =
    options.recompressThresholdBytes ?? RECOMPRESS_THRESHOLD_BYTES;
  try {
    if (!file.type.startsWith("image/")) return file;
    // GIF はアニメーション、SVG はベクタ情報が失われるため対象外
    if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
    if (file.size <= recompressThresholdBytes) return file;
    if (typeof createImageBitmap !== "function") return file;

    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdgePx / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const blob = await drawToJpeg(bitmap, width, height);
    bitmap.close();

    // 再エンコードで逆に大きくなった場合（既に高圧縮の画像など）は原本を使う
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

async function drawToJpeg(
  bitmap: ImageBitmap,
  width: number,
  height: number
): Promise<Blob | null> {
  const draw = (ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D) => {
    // JPEG は透過を持てず、そのままだと透過部分が黒くなるため白で敷く
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
  };

  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    draw(ctx);
    return canvas.convertToBlob({ type: "image/jpeg", quality: JPEG_QUALITY });
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  draw(ctx);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
}
