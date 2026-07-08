import { UserRole, WorkspaceRole } from "@prisma/client";
import NextAuth, { type DefaultSession } from "next-auth";

export type ExtendedUser = DefaultSession["user"] & {
    //customField: string;
    role: UserRole
    isTwoFactorEnabled: boolean;
    isOAuth: boolean;
    // カレンダー「色＝人」のテーマカラー（#RRGGBB）。null は自動割り当て
    color: string | null;
    // 現在のワークスペース（lib/jwt-refresh.ts が membership から解決。最大15分古い）。
    // null は所属なし。API 側の強制は requireWorkspaceMember が DB 再検証で行う。
    currentWorkspaceId: string | null;
    currentWorkspaceName: string | null;
    workspaceRole: WorkspaceRole | null;
}

declare module "next-auth" {
    interface Session {
        user: ExtendedUser;
    }
}


