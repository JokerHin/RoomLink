import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

import { VertexAI } from '@google-cloud/vertexai';

const PROJECT_ID = process.env.GCP_PROJECT_ID || process.env.NEXT_PUBLIC_GCP_PROJECT_ID;
const LOCATION = process.env.GCP_LOCATION || 'us-central1';

async function testWorkerLogic() {
  console.log("Testing Vertex AI REST Authentication...");
  try {
    const { GoogleAuth } = require('google-auth-library');
    const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    console.log("Token acquired successfully.");

    const regions = [LOCATION, 'asia-southeast1', 'us-east1'];
    const models = ['gemini-1.5-flash', 'gemini-1.5-flash-001', 'gemini-1.0-pro'];

    for (const region of regions) {
      for (const modelId of models) {
        console.log(`\n--- Testing ${region} | ${modelId} ---`);
        const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${region}/publishers/google/models/${modelId}:generateContent`;
        
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: "hi" }] }]
            })
          });
          const data = await res.json();
          if (data.candidates) {
            console.log(`✅ SUCCESS in ${region} with ${modelId}!`);
            console.log("Response:", data.candidates[0].content.parts[0].text);
            return;
          } else {
            console.log(`❌ FAILED: ${data.error?.message || 'Unknown error'}`);
          }
        } catch (e: any) {
          console.log(`❌ ERROR: ${e.message}`);
        }
      }
    }
    console.log("\n❌ ALL REGIONS AND MODELS FAILED. Using Fallback mode.");
  } catch(err) {
    console.error("Authentication check failed:", err);
  }
}
testWorkerLogic();
