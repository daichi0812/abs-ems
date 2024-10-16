"use client"

import { useRouter } from "next/navigation"; // "next/router"でインポートしないように！

import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from "@/components/ui/dialog";
import { LoginForm } from "@/components/auth/login-form";

//ログインボタンのインターフェースの定義
interface LoginButtonProps {
    children: React.ReactNode;
    mode?: "modal" | "redirect",
    asChild?: boolean;
    startTransition(callback: () => void): void;
};

export const LoginButton = ({
    children,
    mode = "redirect",
    asChild,
    startTransition,

}: LoginButtonProps) => {
    const router = useRouter();

    const onClick = () => {
        startTransition(() => {
            router.push("/auth/login");
        });
    };
    

    if (mode === "modal") {
        return (
            <Dialog>
                <DialogTrigger asChild={asChild}>
                    {children}
                </DialogTrigger>
                <DialogContent className="p-0 w-auto bg-transparent border-none">
                    <LoginForm />
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <span onClick={onClick} className="cursor-pointer">
            {children}
        </span>
    )
}