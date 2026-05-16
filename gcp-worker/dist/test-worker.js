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
                    }
                    else {
                        console.log(`❌ FAILED: ${data.error?.message || 'Unknown error'}`);
                    }
                }
                catch (e) {
                    console.log(`❌ ERROR: ${e.message}`);
                }
            }
        }
        console.log("\n❌ ALL REGIONS AND MODELS FAILED. Using Fallback mode.");
    }
    catch (err) {
        console.error("Authentication check failed:", err);
    }
}
testWorkerLogic();
