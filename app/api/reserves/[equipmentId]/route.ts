import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

interface Params {
    params: { equipmentId: string };
}

export async function GET(request: Request, { params }: Params) {
    try {
        const equipmentId = parseInt(params.equipmentId, 10);
        if (isNaN(equipmentId)) {
            return NextResponse.json({ error: 'Invalid equipment ID.' }, { status: 400 });
        }

        const reserve = await db.reserve.findMany({
            where: { list_id: equipmentId },
        });

        return NextResponse.json(reserve, { status: 200 });
    } catch (error) {
        console.error('Error fetching reserve:', error);
        return NextResponse.json({ error: 'Failed to fetch reserve.' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: Params) {
    try {
        const equipmentId = parseInt(params.equipmentId, 10);
        if (isNaN(equipmentId)) {
            return NextResponse.json({ error: 'Invalid equipment ID.' }, { status: 400 });
        }

        await db.reserve.deleteMany({
            where: { list_id: equipmentId },
        });

        return NextResponse.json({ message: 'Reserve deleted successfully.' }, { status: 200 });
    } catch (error) {
        console.error('Error deleting reserve:', error);
        return NextResponse.json({ error: 'Failed to delete reserve.' }, { status: 500 });
    }
}