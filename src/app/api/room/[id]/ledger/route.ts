import { NextResponse } from 'next/server';
import { db } from '@/lib/gcp';
import { LedgerChunk } from '@/types/ledger';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: roomId } = await params;
    
    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    const snapshot = await db.collection('workspace_ledger_chunks')
      .where('workspace_id', '==', roomId)
      .get();
      
    const chunks = snapshot.docs.map(doc => {
      const data = doc.data();
      // Omit vector to save bandwidth
      const { embedding_vector, ...safeData } = data;
      return { id: doc.id, ...safeData } as LedgerChunk;
    }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let global_summary = null;
    const summaryDoc = await db.collection('room_summaries').doc(roomId).get();
    if (summaryDoc.exists) {
      global_summary = summaryDoc.data();
    }

    return NextResponse.json({ chunks, global_summary }, { status: 200 });
  } catch (error) {
    console.error('Error fetching ledger chunks:', error);
    return NextResponse.json({ error: 'Failed to fetch ledger chunks' }, { status: 500 });
  }
}
