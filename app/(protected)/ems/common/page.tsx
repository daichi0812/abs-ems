import { CalendarBoard } from "./_components/CalendarBoard";
import { getUserSettings } from "@/actions/user-settings";

const CommonPage = async () => {
  // カレンダー初期表示（月/ガント）はユーザー設定に従う。
  const settings = await getUserSettings();
  const initialView = settings.calendarDefaultView === "GANTT" ? "gantt" : "month";

  return (
    <div>
      <h1 className="mb-3 text-lg font-black text-ink">カレンダー</h1>
      <CalendarBoard initialView={initialView} />
    </div>
  );
};

export default CommonPage;
