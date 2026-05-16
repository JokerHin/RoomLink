import { Firestore } from '@google-cloud/firestore';
import { PubSub } from '@google-cloud/pubsub';

const projectId = process.env.NEXT_PUBLIC_GCP_PROJECT_ID || process.env.GCP_PROJECT_ID;

// Support both local file path (dev) and JSON string env var (Vercel/production)
function getCredentials() {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      console.log('[GCP] Using GOOGLE_CREDENTIALS_JSON for auth, project:', credentials.project_id);
      return { credentials };
    } catch (e) {
      console.error('[GCP] Failed to parse GOOGLE_CREDENTIALS_JSON — is it valid JSON?', e);
    }
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('[GCP] Using GOOGLE_APPLICATION_CREDENTIALS file path');
    return { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS };
  }
  console.log('[GCP] No credentials found, using ADC (Application Default Credentials)');
  return {};
}

const creds = getCredentials();
console.log('[GCP] Initializing clients for project:', projectId);

export const db = new Firestore({
  projectId,
  ...creds,
  preferRest: true,
});

export const pubsub = new PubSub({
  projectId,
  ...creds,
});
