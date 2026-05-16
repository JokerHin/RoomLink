"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv.config({ path: path_1.default.resolve(__dirname, '../../.env.local') });
const pubsub_1 = require("@google-cloud/pubsub");
const projectId = process.env.NEXT_PUBLIC_GCP_PROJECT_ID || process.env.GCP_PROJECT_ID;
const pubsub = new pubsub_1.PubSub({ projectId });
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
    }
    catch (err) {
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
            }
            else {
                console.error(`[Bridge] ❌ Worker returned status: ${response.status}`);
                message.nack(); // Negative acknowledge to retry later
            }
        }
        catch (err) {
            console.error(`[Bridge] ❌ Failed to forward message to worker. Is the worker running?`, err);
            message.nack();
        }
    });
    subscription.on('error', error => {
        console.error('[Bridge] Subscription error:', error);
    });
}
startBridge();
