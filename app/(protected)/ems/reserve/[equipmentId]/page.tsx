import { redirect } from "next/navigation";

// 個別機材の予約ページは予約ウィザード（/ems/equipment-list）へ統合された。
// 旧リンク・ブックマーク救済のためリダイレクトする。
export default function ReserveRedirect() {
  redirect("/ems/equipment-list");
}
