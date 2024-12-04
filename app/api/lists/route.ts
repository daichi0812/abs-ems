import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(){
    await db.lists.create({
        data: {
            name: "test",
            detail: "test",
            image: "imageeee",
            usable: true,
            tag_id: null,
        }
    })

}