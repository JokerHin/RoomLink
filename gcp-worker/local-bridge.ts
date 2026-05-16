import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

import { PubSub } from '@google-cloud/pubsub';

const projectId = process.env.NEXT_PUBLIC_GCP_PROJECT_ID || process.env.GCP_PROJECT_ID;
const pubsub = new PubSub({ projectId });

const TOPIC_NAME = 'linkroom-ingestion';
const SUBSCRIPTION_NAME = 'linkroom-local-sub';
const WORKER_URL = 'http://localhost:8080';

async function startBridge() {
  console.log(`[Bridge] Starting local bridge for project: ${projectId}`);
  
  // 1. Get or Create Subscription
  const topic = pubsub.topic(TOPIC_NAME);
  const subscription = topic.subscription(SUBSCRIPTION_NAME);
  
  try {
    const [exists] = await subscription.exists();
    if (!exists) {
      console.log(`[Bridge] Creating subscription ${SUBSCRIPTION_NAME}...`);
      await topic.createSubscription(SUBSCRIPTION_NAME);
    }
  } catch (err) {
    console.error(`[Bridge] Error checking/creating subscription. Make sure topic '${TOPIC_NAME}' exists.`, err);
    return;
  }

  console.log(`[Bridge] Listening for messages on ${SUBSCRIPTION_NAME}...`);

  // 2. Listen for messages
  subscription.on('message', async (message) => {
    console.log(`\n[Bridge] Received message ID: ${message.id}`);
    
    // Cloud Functions Framework expects a specific CloudEvents structured payload
    const payload = {
      specversion: "1.0",
      type: "google.cloud.pubsub.topic.v1.messagePublished",
      source: `//pubsub.googleapis.com/projects/${projectId}/topics/${TOPIC_NAME}`,
      id: message.id,
      time: message.publishTime.toISOString(),
      data: {
        message: {
          data: message.data.toString('base64'),
          messageId: message.id,
          publishTime: message.publishTime.toISOString(),
        },
        subscription: `projects/${projectId}/subscriptions/${SUBSCRIPTION_NAME}`
      }
    };

    try {
      console.log(`[Bridge] Forwarding to local worker at ${WORKER_URL}...`);
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/cloudevents+json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log(`[Bridge] ✅ Worker processed message successfully.`);
        message.ack(); // Acknowledge message only if worker succeeds
      } else {
        console.error(`[Bridge] ❌ Worker returned status: ${response.status}`);
        message.nack(); // Negative acknowledge to retry later
      }
    } catch (err) {
      console.error(`[Bridge] ❌ Failed to forward message to worker. Is the worker running?`, err);
      message.nack();
    }
  });

  subscription.on('error', error => {
    console.error('[Bridge] Subscription error:', error);
  });
}

startBridge();
