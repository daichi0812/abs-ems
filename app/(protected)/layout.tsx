import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";

interface ProtectedLayoutProps {
    children: React.ReactNode;
}

// この SessionProvider はルート（app/layout.tsx）と二重だが、撤去してはいけない。
// credentials ログインはサーバーアクションの redirect によるソフト遷移のため、
// /auth/login 時点で session=null でマウントされたルートの Provider がそのまま残る。
// next-auth の SessionProvider は props.session を useState の初期値にしか使わず、
// null セッションはイベントでも再取得しないので、内側で auth() の新しいセッションを
// 初期値に取る Provider がないと、ログイン直後から useSession が未認証のまま固定される
// （マイページが空になり、ヘッダーが「ゲスト」になる）。
// タブ復帰ごとの再取得は不要なので refetchOnWindowFocus だけ無効化する。
const ProtectedLayout = async ({ children }: ProtectedLayoutProps) => {
    const session = await auth();

    return (
        <SessionProvider session={session} refetchOnWindowFocus={false}>
            <div className="h-full">
                {children}
            </div>
        </SessionProvider>
    );
}

export default ProtectedLayout;
