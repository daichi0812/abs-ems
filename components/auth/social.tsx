"use client"

import { signIn } from "next-auth/react"
import { FcGoogle } from "react-icons/fc"
import { FaGithub } from "react-icons/fa"
import { useSearchParams } from "next/navigation"

import { DEFAULT_LOGIN_REDIRECT } from "@/routes"
import { useTransition } from "react"
import { Button } from "@chakra-ui/react"

export const Social = () => {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl");

    const onClick = (provider: "google" | "github") => {
        signIn(provider, {
            callbackUrl: callbackUrl || DEFAULT_LOGIN_REDIRECT,
        });
    }

    const [isPending_1, startTransition_1] = useTransition();
    const [isPending_2, startTransition_2] = useTransition();

    return (
        <div className="flex items-center w-full gap-x-2">
            {isPending_1 ? (
                <Button
                    isLoading
                    size="lg"
                    className="w-full"
                    variant="outline"
                    onClick={() => startTransition_1(() => onClick("google"))}
                >
                    <FcGoogle className="h-5 w-5" />
                </Button>
            ) : (
                <Button
                    disabled={isPending_1}
                    size="lg"
                    className="w-full"
                    variant="outline"
                    onClick={() => startTransition_1(() => onClick("google"))}
                >
                    <FcGoogle className="h-5 w-5" />
                </Button>
            )}
            {isPending_2 ? (
                <Button
                    isLoading
                    size="lg"
                    className="w-full"
                    variant="outline"
                    onClick={() => startTransition_2(() => onClick("github"))}
                >
                    <FaGithub className="h-5 w-5" />
                </Button>
            ) : (
                <Button
                    disabled={isPending_2}
                    size="lg"
                    className="w-full"
                    variant="outline"
                    onClick={() => startTransition_2(() => onClick("github"))}
                >
                    <FaGithub className="h-5 w-5" />
                </Button>
            )}

        </div>
    )
}