import { NextResponse } from "next/server";
import { getUserSettings } from "@/actions/user-settings";
import { currentUser } from "@/lib/auth";

// 現在ユーザーの通知・表示設定を返す（未作成なら既定値）。ログイン必須。
export async function GET() {
    const user = await currentUser();
    if (!user?.id) {
        return NextResponse.json({ error: "認証されていません。" }, { status: 401 });
    }

    const settings = await getUserSettings();
    return NextResponse.json(settings, { status: 200 });
}
