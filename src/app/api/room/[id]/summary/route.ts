import { NextResponse } from 'next/server';
import { db } from '@/lib/gcp';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: roomId } = await params;
    const { action_items } = await req.json();

    if (!roomId || !action_items) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    await db.collection('room_summaries').doc(roomId).update({
      action_items,
      updated_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating summary:', error);
    return NextResponse.json({ error: 'Failed to update summary' }, { status: 500 });
  }
}

// Manual trigger for AI worker
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: roomId } = await params;
    
    // We can trigger the worker by publishing a message to Pub/Sub with a special flag
    // For now, let's just assume the user adds a "System Refresh" event
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to trigger' }, { status: 500 });
  }
}
