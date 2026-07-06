import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/route-helpers'

export async function GET(request: Request) {
  // ログイン必須（middleware 一枚依存をやめる defense-in-depth）。
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth
  // カレンダーの予約者名表示に必要な最小限のみ返す（password ハッシュや email を露出させない）
  const users = await db.user.findMany({ select: { id: true, name: true } })
  return NextResponse.json(users)
}
