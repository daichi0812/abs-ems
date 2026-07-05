"use client"

import { signOut } from "next-auth/react";

interface LogoutButtonProps{
    children?: React.ReactNode;
};

export const LogoutButton = ({
    children
}: LogoutButtonProps) => {
    const onClick = () => {
        // Server Action の signOut（actions/logout.ts）は Cloudflare Workers(OpenNext) で
        // セッション削除の Set-Cookie が伝播せず cookie が残る（Vercel 本番では正常＝Workers 固有）。
        // クライアント版 signOut は Route Handler /api/auth/signout を叩く経路で、ログインと同じく
        // Workers でも Set-Cookie が効くため、そちらに切り替える。
        signOut({ redirectTo: "/auth/login" });
    };

    return (
        <span onClick={onClick} className="cursor-pointer">
            {children}
        </span>
    );
};