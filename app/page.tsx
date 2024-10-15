
import { Poppins } from "next/font/google";
import { cn } from "@/lib/utils";

import Image from "next/image";
import { Button } from "@/components/ui/button"
import { useEffect } from "react";
import { LoginButton } from "@/components/auth/login-button";

const font = Poppins({
  subsets: ["latin"],
  weight: ["600"]
})

export default function Home() { // "async は非同期処理 → APIを使う際に使う"
  return (
    <main className="flex h-full flex-col items-center justify-center
    bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
    from-sky-400 to-blue-800">
      <div className="space-y-6 text-center">
        <h1 className={cn("text-6xl font-semibold text-white drop-shadow-md",
          font.className,)}>  {/*フォントを変える時の書き方、cnを用いる */}
          Logicode
        </h1>
        <p className="text-white text-lg">
          ABS Equipment Management System
        </p>
        <div>
          <LoginButton asChild>
            <Button variant="secondary" size="lg">
              サインイン
            </Button>
          </LoginButton>

        </div>
      </div>

    </main>
  );
}