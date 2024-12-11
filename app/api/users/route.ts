import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')

  // クエリパラメータに定義されたSECRET_API_KEYと一致しなければ403
  if (key !== process.env.SECRET_API_KEY) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const users = await db.user.findMany()
  return NextResponse.json(users)
}