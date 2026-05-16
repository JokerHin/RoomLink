import { NextResponse } from 'next/server';
import { pubsub } from '@/lib/gcp';

const TOPIC_NAME = 'linkroom-ingestion';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workspace_id, uploaded_by, source_type, raw_text } = body;

    if (!workspace_id || !uploaded_by || !source_type || !raw_text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const payload = {
      workspace_id,
      uploaded_by,
      timestamp: new Date().toISOString(),
      source_type,
      raw_text,
    };

    const dataBuffer = Buffer.from(JSON.stringify(payload));
    
    // Asynchronously publish to Pub/Sub
    await pubsub.topic(TOPIC_NAME).publishMessage({ data: dataBuffer });

    // Immediate 202 Accepted return without hanging
    return NextResponse.json({ message: 'Ingestion payload accepted.' }, { status: 202 });
  } catch (error) {
    console.error('Ingest error:', error);
    return NextResponse.json({ error: 'Failed to process ingestion' }, { status: 500 });
  }
}
