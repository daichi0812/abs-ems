"use client"

import { signOut } from "next-auth/react";

interface LogoutButtonProps{
    children?: React.ReactNode;
};

export const LogoutButton = ({
    children
}: LogoutButtonProps) => {
    const onClick = () => {
        // クライアント版 signOut（Route Handler /api/auth/signout を叩く）を使う。理由:
        // Server Action 版の signOut は「今いるページ経路」に POST する。ページ経路は middleware に
        // マッチするため、middleware の auth() ラッパーが jwt セッション cookie を再発行し、
        // signOut のセッション削除 Set-Cookie を打ち消してしまう（Cloudflare Workers/OpenNext 固有。
        // Vercel は cookie マージ順で削除が勝つため顕在化しない）。
        // クライアント版は /api/auth/signout に POST する。ここは middleware の matcher から除外済み
        // （middleware.ts 参照）なので route handler だけが cookie を触り、削除が確実に効く。
        signOut({ redirectTo: "/auth/login" });
    };

    return (
        <span onClick={onClick} className="cursor-pointer">
            {children}
        </span>
    );
};