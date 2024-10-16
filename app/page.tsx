"use client"

import { Poppins } from "next/font/google";
import { cn } from "@/lib/utils";
import { LoginButton } from "@/components/auth/login-button";
import { useTransition } from "react";
import { Button } from "@chakra-ui/react";

const font = Poppins({
  subsets: ["latin"],
  weight: ["600"],
});

export default function Home() {
  const [isPending, startTransition] = useTransition();

  return (
    <main className="flex h-full flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-400 to-blue-800">
      <div className="space-y-6 text-center">
        <h1 className={cn("text-6xl font-semibold text-white drop-shadow-md", font.className)}>
          Logicode
        </h1>
        <p className="text-white text-lg">ABS Equipment Management System</p>
        <div>
          <LoginButton asChild startTransition={startTransition}>
            {isPending ? (
              <Button isLoading>
                サインイン
              </Button>
            ) : (
              <Button disabled={isPending}>
                サインイン
              </Button>
            )}
          </LoginButton>
        </div>
      </div>
    </main>
  );
}
