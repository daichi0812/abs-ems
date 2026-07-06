"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { categoryColor } from "@/lib/category-colors";

export interface CategoryOption {
  id: string | number;
  name: string;
  color: string;
}

// 機材の登録／編集で共通のフォーム。写真ドロップゾーン・カテゴリチップ・機材名・説明。
// カテゴリは name で選択する（既存フックの契約に合わせる）。
export function EquipmentForm({
  categories,
  name,
  onName,
  detail,
  onDetail,
  selectedTagName,
  onSelectTag,
  previewUrl,
  existingImageUrl,
  inputFileRef,
  onFileChange,
  submitLabel,
  onSubmit,
  canSubmit,
  isSubmitting,
}: {
  categories: CategoryOption[];
  name: string;
  onName: (v: string) => void;
  detail: string;
  onDetail: (v: string) => void;
  selectedTagName: string;
  onSelectTag: (name: string) => void;
  previewUrl?: string;
  existingImageUrl?: string;
  inputFileRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  submitLabel: string;
  onSubmit: () => void;
  canSubmit: boolean;
  isSubmitting: boolean;
}) {
  const shownImage = previewUrl || existingImageUrl || "";

  // 文言どおり PC からのドラッグ&ドロップを受け付ける。preventDefault しないと
  // ブラウザが画像ファイルそのものを開いてページ遷移し、入力途中の内容が全部消える。
  const handleDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/") || !inputFileRef.current) return;
    // input.files へ流し込み、既存の onChange 経路（プレビュー生成・送信時参照）を再利用する
    const dt = new DataTransfer();
    dt.items.add(file);
    inputFileRef.current.files = dt.files;
    inputFileRef.current.dispatchEvent(new Event("change", { bubbles: true }));
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="m-0 mb-2 text-xs font-bold text-ink-muted">機材の写真</p>
      <button
        type="button"
        onClick={() => inputFileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="relative flex h-[180px] w-full items-center justify-center overflow-hidden rounded-[14px] border-[1.5px] border-dashed border-line-strong bg-surface text-[13px] text-ink-faint"
      >
        {shownImage ? (
          <Image src={shownImage} alt="機材の写真" fill className="object-contain" unoptimized />
        ) : (
          "タップ / ドロップで写真を追加"
        )}
      </button>
      <input
        ref={inputFileRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="hidden"
      />

      <p className="m-0 mb-2 mt-4 text-xs font-bold text-ink-muted">
        カテゴリ <RequiredBadge />
      </p>
      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => {
          const on = selectedTagName === c.name;
          const color = categoryColor(c.color);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectTag(c.name)}
              className={cn(
                "flex h-[34px] items-center gap-1.5 rounded-full border-[1.5px] px-3 text-[12.5px] font-bold transition-colors"
              )}
              style={{
                borderColor: on ? color : "#E4E7EC",
                background: on ? `${color}14` : "#fff",
                color: on ? color : "#475467",
              }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: color }} />
              {c.name}
            </button>
          );
        })}
      </div>

      <p className="m-0 mb-2 mt-4 text-xs font-bold text-ink-muted">
        機材名 <RequiredBadge />
      </p>
      <input
        value={name}
        onChange={(e) => onName(e.target.value)}
        placeholder="例：α7S III ボディ"
        className="h-[46px] w-full rounded-xl border-[1.5px] border-line bg-[#F9FAFB] px-3.5 text-[15px] outline-none focus:border-brand focus:bg-white"
      />

      <p className="m-0 mb-2 mt-4 text-xs font-bold text-ink-muted">説明（任意）</p>
      <textarea
        value={detail}
        onChange={(e) => onDetail(e.target.value)}
        placeholder="付属品・使用上の注意など"
        className="h-[90px] w-full resize-y rounded-xl border-[1.5px] border-line bg-[#F9FAFB] px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:bg-white"
      />

      <button
        type="button"
        disabled={!canSubmit || isSubmitting}
        onClick={onSubmit}
        className="mt-4 h-12 w-full rounded-[14px] bg-brand text-[15px] font-bold text-white shadow-[0_8px_20px_-6px_rgba(46,144,250,.5)] transition-colors hover:bg-brand-dark disabled:opacity-40 disabled:shadow-none"
      >
        {isSubmitting ? "処理中…" : submitLabel}
      </button>
      {/* ボタンが押せない理由を明示する（灰色のまま理由が分からない状態を防ぐ） */}
      {!canSubmit && !isSubmitting && (
        <p className="m-0 mt-2 text-center text-[11.5px] text-ink-faint">
          {name.trim() === "" && selectedTagName === ""
            ? "機材名の入力とカテゴリの選択が必要です"
            : name.trim() === ""
              ? "機材名を入力してください"
              : "カテゴリを選択してください"}
        </p>
      )}
    </div>
  );
}

function RequiredBadge() {
  return (
    <span className="ml-0.5 rounded bg-[#FEF3F2] px-1 py-px text-[10px] font-bold text-danger">
      必須
    </span>
  );
}
