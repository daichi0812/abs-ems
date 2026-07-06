"use client"

import { 
    Card,
    CardContent,
    CardFooter,
    CardHeader,
 } from "@/components/ui/card";
import { Header } from "@/components/auth/header";
import { Social } from "@/components/auth/social";
import { BackButton } from "@/components/auth/back-button";

interface CardWrapperProps {
    children: React.ReactNode;
    headerLabel: string;
    backButtonLabel: string;
    backButtonHref: string;
    showSocial?: boolean;
};

export const CardWrapper = ({
    children,
    headerLabel,
    backButtonLabel,
    backButtonHref,
    showSocial
}: CardWrapperProps) => {
    // 固定幅だと CSS 幅360px級の端末（Galaxy 等）で左右が見切れるため max-width にする
    // （スマホでは w-full で画面幅いっぱい−px-4、広い画面では 420px）
    return (
        <Card className="w-full max-w-[420px] rounded-2xl border-0 bg-white shadow-xl">
            <CardHeader>
                <Header label={headerLabel} />
            </CardHeader>
            <CardContent>
                {children}
            </CardContent>
            {showSocial && (
                <CardFooter>
                    <Social />
                </CardFooter>
            )}
            <CardFooter>
                <BackButton 
                label={backButtonLabel}
                href={backButtonHref}
                />
            </CardFooter>
        </Card>
    )
}