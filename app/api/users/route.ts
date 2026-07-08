import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireWorkspaceMember } from '@/lib/route-helpers'

export async function GET(request: Request) {
  // 所属メンバー必須（middleware 一枚依存をやめる defense-in-depth）。
  // 現在のワークスペースのメンバーだけを返す（別団体の氏名を露出させない）。
  const ctx = await requireWorkspaceMember()
  if (ctx instanceof NextResponse) return ctx
  const memberIds = (
    await db.membership.findMany({
      where: { workspaceId: ctx.workspaceId },
      select: { userId: true },
    })
  ).map((m) => m.userId)
  // カレンダーの予約者名表示に必要な最小限のみ返す（password ハッシュや email を露出させない）
  const users = await db.user.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, name: true },
  })
  return NextResponse.json(users)
}
