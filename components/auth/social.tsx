"use client"

import { signIn } from "next-auth/react"
import { FcGoogle } from "react-icons/fc"
import { FaGithub } from "react-icons/fa"
import { useSearchParams } from "next/navigation"

import { DEFAULT_LOGIN_REDIRECT } from "@/routes"
import { useState } from "react"
import { Button } from "@chakra-ui/react"

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

    return (
        <div className="flex items-center w-full gap-x-2">
            <Button
                isLoading={isLoadingGoogle}
                size="lg"
                className="w-full"
                variant="outline"
                onClick={() => onClick("google")}
                disabled={isLoadingGoogle}
            >
                <FcGoogle className="h-5 w-5" />
            </Button>
            <Button
                isLoading={isLoadingGithub}
                size="lg"
                className="w-full"
                variant="outline"
                onClick={() => onClick("github")}
                disabled={isLoadingGithub}
            >
                <FaGithub className="h-5 w-5" />
            </Button>
        </div>
    );
};
