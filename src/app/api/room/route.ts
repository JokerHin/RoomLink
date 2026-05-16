import { NextResponse } from 'next/server';
import { db } from '@/lib/gcp';
import { WorkspaceRoom, WorkspaceDeal } from '@/types/ledger';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { buyer, supplier, topic_name } = body;

    if (!buyer || !supplier) {
      return NextResponse.json({ error: 'Missing buyer or supplier domains' }, { status: 400 });
    }
    
    const finalTopicName = topic_name || 'General';

    // Generate deterministic-looking ID (e.g., room-buyer-supplier-timestamp)
    const timestampId = Math.floor(Date.now() / 1000).toString().slice(-4);
    
    // Create Shared Room
    const sharedId = `shared-${supplier.split('.')[0]}-${buyer.split('.')[0]}-${timestampId}`;
    const sharedRoom: WorkspaceRoom = {
      id: sharedId,
      created_at: new Date().toISOString(),
      associated_domains: [buyer, supplier],
      buyer,
      supplier,
    };

    // Create Internal Room for the Organizer (Supplier)
    const internalId = `internal-${supplier.split('.')[0]}-${timestampId}`;
    const internalRoom: WorkspaceRoom = {
      id: internalId,
      created_at: new Date().toISOString(),
      associated_domains: [supplier], // Strictly isolated to Supplier
      buyer: 'INTERNAL',
      supplier,
    };

    // Create Deal wrapper
    const dealId = `deal-${supplier.split('.')[0]}-${buyer.split('.')[0]}-${timestampId}`;
    const deal: WorkspaceDeal = {
      id: dealId,
      created_at: new Date().toISOString(),
      topic_name: finalTopicName,
      supplier,
      buyer,
      shared_room_id: sharedId,
      internal_room_id: internalId,
    };

    // Save to Firestore
    await db.collection('workspaces').doc(sharedId).set(sharedRoom);
    await db.collection('workspaces').doc(internalId).set(internalRoom);
    await db.collection('deals').doc(dealId).set(deal);

    return NextResponse.json({ success: true, deal, room: sharedRoom, internalRoom }, { status: 201 });
  } catch (error) {
    console.error('Error creating deal/rooms:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const snapshot = await db.collection('deals').orderBy('created_at', 'desc').limit(10).get();
    
    const deals = snapshot.docs.map(doc => doc.data() as WorkspaceDeal);
    
    return NextResponse.json({ deals }, { status: 200 });
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 });
  }
}
