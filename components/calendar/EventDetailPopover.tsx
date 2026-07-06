"use client";

import Image from "next/image";
import { memberColor, memberInitial } from "@/lib/calendar/member-colors";

// 予約バーの詳細（誰が・何を・いつまで）。月カレンダーで選択したバーの内容を
// ネイビーカードで表示する（スマホは下部インライン、PC は横のサイドに配置する想定）。
export interface EventDetail {
  who: string;
  equipment: string;
  rangeText: string;
  leftText: string; // 「あとN日」「今日返却」など
}

export function EventDetailPopover({
  detail,
  color: colorProp,
  image,
}: {
  detail: EventDetail;
  /** バー側と同じ色割り当て（memberColorMap）を使う場合に渡す。省略時はハッシュ色 */
  color?: string;
  /** 本人設定のアイコン画像。あればイニシャルの代わりに表示する */
  image?: string;
}) {
  const color = colorProp ?? memberColor(detail.who);
  return (
    <div className="rounded-2xl bg-navy p-[13px] px-[15px] text-white">
      <div className="flex items-center gap-2.5">
        {image ? (
          <Image
            src={image}
            alt=""
            width={30}
            height={30}
            className="h-[30px] w-[30px] flex-none rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-[13px] font-bold text-white"
            style={{ background: color }}
          >
            {memberInitial(detail.who)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-[13.5px] font-bold">
            {detail.who} が {detail.equipment} を予約
          </p>
          <p className="m-0 mt-0.5 text-[11px] text-white/65">
            {detail.rangeText} · <b className="text-warning-gold">{detail.leftText}</b>
          </p>
        </div>
      </div>
    </div>
  );
}
