import { NextResponse } from "next/server";
import { getUserSettings } from "@/actions/user-settings";
import { requireUser } from "@/lib/route-helpers";

// 現在ユーザーの通知・表示設定を返す（未作成なら既定値）。ログイン必須。
export async function GET() {
    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;

    const settings = await getUserSettings();
    return NextResponse.json(settings, { status: 200 });
}
