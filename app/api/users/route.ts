import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const users = await db.user.findMany()
  return NextResponse.json(users)
}