import { Firestore } from '@google-cloud/firestore';
import { PubSub } from '@google-cloud/pubsub';

const projectId = process.env.NEXT_PUBLIC_GCP_PROJECT_ID || process.env.GCP_PROJECT_ID;

export const db = new Firestore({
  projectId: projectId,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  preferRest: true,
});

export const pubsub = new PubSub({
  projectId: projectId,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  fallback: true,
});
