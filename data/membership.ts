import { db } from "@/lib/db";

/** ユーザーの全所属を取得（作成順）。currentWorkspace のフォールバック解決に使う。 */
export const getMembershipsByUserId = async (userId: string) => {
  try {
    return await db.membership.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  } catch {
    return [];
  }
};
