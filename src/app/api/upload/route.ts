import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'linkroom-files-object';

function getStorageClient() {
  const projectId = process.env.NEXT_PUBLIC_GCP_PROJECT_ID;
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    return new Storage({ projectId, credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON) });
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return new Storage({ projectId, keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS });
  }
  return new Storage({ projectId }); // ADC fallback for Cloud Run
}

const storage = getStorageClient();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Build a unique GCS path: uploads/<timestamp>-<filename>
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const gcsPath = `uploads/${timestamp}-${safeName}`;

    const bucket = storage.bucket(BUCKET_NAME);
    const gcsFile = bucket.file(gcsPath);

    // Upload the buffer
    await gcsFile.save(buffer, {
      contentType: file.type || 'application/octet-stream',
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });

    // Note: No makePublic() needed — the bucket has uniform allUsers Storage Object Viewer access
    // Return the public URL
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${gcsPath}`;

    return NextResponse.json({ url: publicUrl, fileName: file.name });
  } catch (error: any) {
    console.error('GCS upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
