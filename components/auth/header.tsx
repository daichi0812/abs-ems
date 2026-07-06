import Image from "next/image";

interface HeaderProps {
    label: string;
};

// 認証カード共通のヘッダー。旧テンプレートの「🔐 Auth」（Poppins）から
// アプリのアイコン + ロゴタイプへ差し替え（UI刷新後のデザインに合わせる）。
export const Header = ({
    label,
}: HeaderProps) => {
    return (
        <div className="flex w-full flex-col items-center justify-center gap-y-3">
            <Image
                src="/ABS-EMS512_rounded.png"
                alt=""
                width={56}
                height={56}
                priority
                className="h-14 w-14"
            />
            <div className="text-center">
                <h1 className="m-0 text-xl font-black tracking-wide text-ink">
                    ABS EMS
                </h1>
                <p className="m-0 mt-1 text-sm text-ink-muted">
                    {label}
                </p>
            </div>
        </div>
    )
}
