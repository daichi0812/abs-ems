import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  // カレンダーの予約者名表示に必要な最小限のみ返す（password ハッシュや email を露出させない）
  const users = await db.user.findMany({ select: { id: true, name: true } })
  return NextResponse.json(users)
}
