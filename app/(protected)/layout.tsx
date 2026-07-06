interface ProtectedLayoutProps {
    children: React.ReactNode;
}

// SessionProvider は app/layout.tsx（ルート）で一度だけ提供する。
// 以前はここでも auth() + SessionProvider を重ねていたが、SSR ごとの auth() が1回増えるうえ、
// visibilitychange のリスナーが二重登録される割に再取得結果は外側の Provider にしか
// 反映されないため、二重化をやめた。認可自体は middleware が担う。
const ProtectedLayout = ({ children }: ProtectedLayoutProps) => {
    return (
        <div className="h-full">
            {children}
        </div>
    );
}

export default ProtectedLayout;
