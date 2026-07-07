"use client";

import { useMemo } from "react";

import { toJstDayIndex, formatRange } from "@/lib/calendar/date-grid";
import { categoryColor, categoryIconPath } from "@/lib/category-colors";
import { flattenNewlines } from "@/lib/text";
import type { DayRange } from "@/components/calendar/RangeMiniCalendar";
import type { Equipment, Reserve } from "@/types/domain";
import type { Category } from "@/app/(protected)/ems/equipment-list/hooks/use-categories";
import type { CartItem, PickGroup } from "@/app/(protected)/ems/equipment-list/_components/types";

interface UserLite {
  id: string;
  name: string;
}

interface UseAvailabilityGroupsParams {
  equipments: Equipment[];
  categories: Category[];
  catLoading: boolean;
  reserves: Reserve[];
  users: UserLite[];
  range: DayRange;
  rangeOk: boolean;
  cart: number[];
  query: string;
  freeOnly: boolean;
}

/**
 * 予約ウィザードの空き状況の派生データ（カテゴリ別グループ・検索/空きのみ絞り込み後の
 * 表示グループ・カートの表示用データ）をまとめて算出する。
 * BookingWizard 本体からドメインロジックを切り出したもの。
 */
export function useAvailabilityGroups({
  equipments,
  categories,
  catLoading,
  reserves,
  users,
  range,
  rangeOk,
  cart,
  query,
  freeOnly,
}: UseAvailabilityGroupsParams) {
  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? "他の人";

  // カテゴリ順にグループ化し、期間中の空き状況を付与する
  const groups = useMemo<PickGroup[]>(() => {
    if (!rangeOk) return [];

    const toItem = (e: Equipment) => {
      // 競合は全件拾って開始日順に出す。先頭1件だけだと「表示された予約を避けて
      // 期間を選び直したのにまだ弾かれる」という手戻りが起きる（DB挿入順は日付順ですらない）。
      const conflicts = reserves
        .filter(
          (r) =>
            r.list_id === e.id &&
            range.startIdx! <= toJstDayIndex(r.end) &&
            range.endIdx! >= toJstDayIndex(r.start)
        )
        .sort((a, b) => toJstDayIndex(a.start) - toJstDayIndex(b.start));
      const free = conflicts.length === 0;
      const first = conflicts[0];
      return {
        id: e.id,
        name: e.name,
        detail: flattenNewlines(e.detail ?? ""),
        image: e.image ?? "",
        free,
        sub: free
          ? "この期間は空いています"
          : `${formatRange(toJstDayIndex(first.start), toJstDayIndex(first.end))} ${userName(first.user_id)}が予約${conflicts.length > 1 ? ` ほか${conflicts.length - 1}件` : ""}`,
        selected: cart.includes(e.id),
      };
    };

    const grouped = categories.map((cat) => ({
      catId: String(cat.id),
      catName: cat.name,
      color: categoryColor(cat.color),
      iconPath: categoryIconPath(cat.name),
      items: equipments.filter((e) => String(e.tag_id) === String(cat.id)).map(toItem),
    }));

    // カテゴリ未設定・カテゴリ削除後の機材も「未分類」として末尾に出す。
    // 以前はどのグループにも入らず、部員からは機材が消えて予約不可能になっていた。
    // 読み込み中は全機材が未分類に見えてしまうため isLoading で判定する
    // （categories.length だと最後の1カテゴリを削除した後に未分類が出なくなる）。
    if (!catLoading) {
      const knownIds = new Set(categories.map((c) => String(c.id)));
      const uncategorized = equipments.filter(
        (e) => e.tag_id == null || !knownIds.has(String(e.tag_id))
      );
      if (uncategorized.length > 0) {
        grouped.push({
          catId: "uncategorized",
          catName: "未分類",
          color: categoryColor(null),
          iconPath: categoryIconPath(null),
          items: uncategorized.map(toItem),
        });
      }
    }

    return grouped.filter((g) => g.items.length > 0);
  }, [categories, catLoading, equipments, reserves, rangeOk, range, cart, users]);

  // 検索・空きのみ絞り込み（絞り込みで空になったカテゴリは出さない）
  const visibleGroups = useMemo<PickGroup[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q && !freeOnly) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (it) => (!freeOnly || it.free) && (!q || it.name.toLowerCase().includes(q))
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query, freeOnly]);

  const cartItems = useMemo<CartItem[]>(
    () =>
      cart.map((id) => {
        const e = equipments.find((q) => q.id === id);
        const cat = categories.find((c) => String(c.id) === String(e?.tag_id));
        const color = categoryColor(cat?.color);
        return {
          id,
          name: e?.name ?? "",
          image: e?.image ?? "",
          color,
          iconPath: categoryIconPath(cat?.name),
        };
      }),
    [cart, equipments, categories]
  );

  return { groups, visibleGroups, cartItems };
}
