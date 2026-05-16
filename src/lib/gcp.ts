import { Firestore } from '@google-cloud/firestore';
import { PubSub } from '@google-cloud/pubsub';

const projectId = process.env.NEXT_PUBLIC_GCP_PROJECT_ID || process.env.GCP_PROJECT_ID;

// Support both local file path (dev) and JSON string env var (Vercel/production)
function getCredentials() {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    return { credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON) };
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS };
  }
  return {}; // Cloud Run / Cloud Functions use ADC automatically
}

const creds = getCredentials();

export const db = new Firestore({
  projectId,
  ...creds,
  preferRest: true,
});

export const pubsub = new PubSub({
  projectId,
  ...creds,
  fallback: true,
});
