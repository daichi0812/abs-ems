import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { currentUser } from '@/lib/auth'

export async function GET(req: Request) {
  // ログイン必須（middleware 一枚依存をやめる defense-in-depth）。
  const user = await currentUser()
  if (!user?.id) {
    return NextResponse.json({ error: '認証されていません。' }, { status: 401 })
  }
  // カレンダーの予約者名表示に必要な最小限のみ返す（password ハッシュや email を露出させない）
  const users = await db.user.findMany({ select: { id: true, name: true } })
  return NextResponse.json(users)
}
