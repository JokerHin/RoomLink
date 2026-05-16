import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { Firestore } from '@google-cloud/firestore';

const db = new Firestore({
  projectId: process.env.NEXT_PUBLIC_GCP_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  preferRest: true
});

async function check() {
  console.log("Checking Firestore...");
  const snapshot = await db.collection('workspace_ledger_chunks').get();
  console.log(`Found ${snapshot.docs.length} chunks`);
  snapshot.docs.forEach(doc => {
    console.log(doc.id, doc.data().workspace_id, doc.data().uploaded_by);
  });
}
check();
