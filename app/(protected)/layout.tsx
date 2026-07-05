import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";

interface ProtectedLayoutProps {
    children: React.ReactNode;
}

const ProtectedLayout = async ({ children }: ProtectedLayoutProps) => {
    const session = await auth();

    return (
        <SessionProvider session={session}>
            <div className="h-full">
                {children}
            </div>
        </SessionProvider>
    );
}

export default ProtectedLayout;