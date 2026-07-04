import { currentRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { MANAGER_KEY_HEADER } from "@/lib/manager-auth";

/**
 * 機材・タグの変更API へのアクセス可否を判定する。
 * role=ADMIN、または manager パスワード（NEXT_PUBLIC_MANAGER_KEY）を
 * x-manager-key ヘッダーに持つリクエストを許可する。
 *
 * 現状 abs-ems の管理者判定は外部サービスの owner フラグ + パスワードで
 * 運用されており、DB の role=ADMIN とは別系統。role 運用が整うまでの間、
 * 運用者を締め出さないためパスワードによるフォールバックを許可する。
 * NEXT_PUBLIC_MANAGER_KEY はブラウザに露出するため、これは正規ユーザーの
 * 便宜のためのゲートであり、悪意ある第三者への防御にはならない点に注意。
 */
export const hasManagerAccess = async (request: Request): Promise<boolean> => {
  const role = await currentRole();
  if (role === UserRole.ADMIN) return true;

  const managerKey = process.env.NEXT_PUBLIC_MANAGER_KEY;
  const providedKey = request.headers.get(MANAGER_KEY_HEADER);
  return !!managerKey && providedKey === managerKey;
};
