import { db } from "@/lib/db";

/** ワークスペース名を取得（jwt-refresh がセッション表示用に使う）。失敗は null。 */
export const getWorkspaceNameById = async (workspaceId: string) => {
  try {
    const ws = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });
    return ws?.name ?? null;
  } catch {
    return null;
  }
};
