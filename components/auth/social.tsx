"use client"

import { signIn } from "next-auth/react"
import { FcGoogle } from "react-icons/fc"
import { FaGithub } from "react-icons/fa"
import { useSearchParams } from "next/navigation"
import { useState } from "react"

import { DEFAULT_LOGIN_REDIRECT } from "@/routes"

export const Social = () => {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl");

    const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
    const [isLoadingGithub, setIsLoadingGithub] = useState(false);

    const onClick = async (provider: "google" | "github") => {
        if (provider === "google") {
            setIsLoadingGoogle(true);
        } else {
            setIsLoadingGithub(true);
        }

        try {
            await signIn(provider, {
                callbackUrl: callbackUrl || DEFAULT_LOGIN_REDIRECT,
            });
        } finally {
            setIsLoadingGoogle(false);
            setIsLoadingGithub(false);
        }
    };

    const baseClass =
        "flex h-11 w-full items-center justify-center rounded-xl border-[1.5px] border-line bg-white transition-colors hover:bg-surface disabled:opacity-60";

    return (
        <div className="flex w-full items-center gap-x-2">
            <button
                type="button"
                onClick={() => onClick("google")}
                disabled={isLoadingGoogle}
                className={baseClass}
                aria-label="Googleでログイン"
            >
                {isLoadingGoogle ? <Spinner /> : <FcGoogle className="h-5 w-5" />}
            </button>
            <button
                type="button"
                onClick={() => onClick("github")}
                disabled={isLoadingGithub}
                className={baseClass}
                aria-label="GitHubでログイン"
            >
                {isLoadingGithub ? <Spinner /> : <FaGithub className="h-5 w-5" />}
            </button>
        </div>
    );
};

function Spinner() {
    return (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-brand" />
    );
}
