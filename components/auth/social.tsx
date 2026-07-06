"use client"

import { signIn } from "next-auth/react"
import { FcGoogle } from "react-icons/fc"
import { useSearchParams } from "next/navigation"
import { useState } from "react"

import { DEFAULT_LOGIN_REDIRECT } from "@/routes"

// ソーシャルログイン。GitHub は部員に利用者がいないため導線を撤去し、
// Google のみをラベル付きの全幅ボタンで出す（auth.config.ts の provider 自体は
// 残してあるので、万一 GitHub 連携済みアカウントがあっても API 経路は生きている）。
export const Social = () => {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl");

    const [isLoading, setIsLoading] = useState(false);

    const onClick = async () => {
        setIsLoading(true);
        try {
            await signIn("google", {
                callbackUrl: callbackUrl || DEFAULT_LOGIN_REDIRECT,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isLoading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-line bg-white text-[13.5px] font-bold text-ink-sub transition-colors hover:bg-surface disabled:opacity-60"
        >
            {isLoading ? <Spinner /> : <FcGoogle className="h-5 w-5" />}
            Googleでログイン
        </button>
    );
};

function Spinner() {
    return (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-brand" />
    );
}
