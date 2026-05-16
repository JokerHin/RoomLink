import { NextResponse } from 'next/server';
import { db } from '@/lib/gcp';
import { GoogleAuth } from 'google-auth-library';
import { FieldValue } from '@google-cloud/firestore';

const PROJECT_ID = process.env.NEXT_PUBLIC_GCP_PROJECT_ID || process.env.GCP_PROJECT_ID;
const LOCATION = process.env.GCP_LOCATION || 'us-central1';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query, workspace_id } = body;

    if (!query || !workspace_id) {
      return NextResponse.json({ error: 'Missing query or workspace_id' }, { status: 400 });
    }

    // 1. Get Embedding for the query using REST
    const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
    const client = await auth.getClient();
    const token = await client.getAccessToken();

    const embedUrl = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/text-embedding-004:predict`;
    const embedRes = await fetch(embedUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        instances: [{ content: query }]
      })
    });
    
    const embedData = await embedRes.json();
    const queryVector = embedData.predictions?.[0]?.embeddings?.values;

    if (!queryVector) {
        console.error("Embedding Error:", JSON.stringify(embedData));
        throw new Error('No embedding returned from Vertex AI');
    }

    // 2. Perform the secure vector search bounded by workspace_id
    const collectionRef = db.collection('workspace_ledger_chunks');
    const searchResults = await collectionRef
      .where('workspace_id', '==', workspace_id)
      .findNearest({
        vectorField: 'embedding_vector',
        queryVector: FieldValue.vector(queryVector),
        distanceMeasure: 'COSINE',
        limit: 5
      })
      .get();

    const results = searchResults.docs.map(doc => {
        const data = doc.data();
        // Omit embedding_vector from the returned payload for efficiency
        const { embedding_vector, ...safeData } = data;
        return { id: doc.id, ...safeData };
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Failed to perform semantic search' }, { status: 500 });
  }
}
