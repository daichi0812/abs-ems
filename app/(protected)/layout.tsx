import { Navbar } from "./_components/navbar";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";

interface ProtectedLayoutProps {
    children: React.ReactNode;
}

const ProtectedLayout = async ({ children }: ProtectedLayoutProps) => {
    const session = await auth();

    return (
        <SessionProvider session={session}>
            {/* <div className="h-full w-full flex flex-col gap-y-10 items-center justify-center 
        bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
        from-sky-400 to-blue-800">
                <Navbar />
                {children}
            </div> */}
            <div className="h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
        from-sky-400 to-blue-800">
                {children}
            </div>
        </SessionProvider>
    );
}

export default ProtectedLayout;