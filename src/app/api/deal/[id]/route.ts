import { NextResponse } from 'next/server';
import { db } from '@/lib/gcp';
import { WorkspaceDeal } from '@/types/ledger';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: dealId } = await params;
    
    if (!dealId) {
      return NextResponse.json({ error: 'Deal ID is required' }, { status: 400 });
    }

    const doc = await db.collection('deals').doc(dealId).get();
    
    if (!doc.exists) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    return NextResponse.json({ deal: doc.data() as WorkspaceDeal }, { status: 200 });
  } catch (error) {
    console.error('Error fetching deal:', error);
    return NextResponse.json({ error: 'Failed to fetch deal' }, { status: 500 });
  }
}
