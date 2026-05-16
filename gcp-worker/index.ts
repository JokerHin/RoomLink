import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the parent directory's .env.local file
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

import { cloudEvent } from '@google-cloud/functions-framework';
import { Firestore, FieldValue } from '@google-cloud/firestore';

const PROJECT_ID = process.env.GCP_PROJECT_ID || process.env.NEXT_PUBLIC_GCP_PROJECT_ID;
const LOCATION = process.env.GCP_LOCATION || 'us-central1';

const firestore = new Firestore({ projectId: PROJECT_ID, preferRest: true });

interface PubSubMessage {
  workspace_id: string;
  uploaded_by: string;
  timestamp: string;
  source_type: "email_string" | "meeting_transcript" | "document";
  raw_text: string;
  file_data?: string;
  file_name?: string;
}

cloudEvent('processIngestion', async (cloudEvent: any) => {
  const base64name = cloudEvent.data?.message?.data;
  if (!base64name) {
    console.error('No data found in the Pub/Sub message.');
    return;
  }

  const payloadString = Buffer.from(base64name, 'base64').toString();
  const payload: PubSubMessage = JSON.parse(payloadString);

  console.log(`Processing payload for workspace: ${payload.workspace_id}`);

  const HARDCODED_KEY = "AIzaSyAJ_i9d0TiltyV_JOgwmvNDSOxym7wdwVQ";
  const apiKey = process.env.GEMINI_API_KEY || HARDCODED_KEY;

  try {
    let embeddingVector: number[] = Array(768).fill(0);
    
    // 1. Generate Embeddings via REST Pipeline (Gemini Embedding 2)
    try {
      // Use AI Studio for embeddings as well, since Vertex is having 404 issues
      const embeddingUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`;
      
      const embeddingRes = await fetch(embeddingUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text: payload.raw_text }] }
        })
      });
      const embeddingData = await embeddingRes.json();
      if (embeddingData.embedding?.values) {
        embeddingVector = embeddingData.embedding.values;
        console.log("✅ Embeddings generated via Gemini Embedding 2");
      } else {
        console.warn("Embedding fetch failed:", JSON.stringify(embeddingData));
      }
    } catch (e) {
      console.warn("Embedding fetch failed, using zero-vector", e);
    }

    // 2. Save Chunk to Firestore Immediately
    if (payload.source_type !== 'refresh_ai' as any) {
      const ledgerChunk = {
        workspace_id: payload.workspace_id,
        uploaded_by: payload.uploaded_by,
        timestamp: payload.timestamp || new Date().toISOString(),
        source_type: payload.source_type,
        raw_text: payload.raw_text,
        file_data: payload.file_data || null,
        file_name: payload.file_name || null,
        ...(embeddingVector.length > 0 && embeddingVector[0] !== 0 ? { embedding_vector: FieldValue.vector(embeddingVector) } : {})
      };

      const docRef = await firestore.collection('workspace_ledger_chunks').add(ledgerChunk);
      console.log(`Document written with ID: ${docRef.id}`);
    } else {
      console.log("Refresh requested. Skipping chunk save.");
    }

    // 3. Fetch Historical Context for Multi-Tenant Analysis
    const snapshot = await firestore.collection('workspace_ledger_chunks')
      .where('workspace_id', '==', payload.workspace_id)
      .get();
      
    const allChunks = snapshot.docs.map(d => d.data() as any).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    let historyText = `PROJECT TRANSACTION HISTORY:\n\n`;
    allChunks.forEach(c => {
      historyText += `--- EVENT [${c.source_type}] FROM [${c.uploaded_by}] ON [${c.timestamp}] ---\n${c.raw_text}\n\n`;
    });

    // 4. Ecosystem Governance AI Orchestration
    const prompt = `You are an Ecosystem Governance AI Architect monitoring B2B partner linkages.
    Analyze the transaction history provided and map out relationship operational metrics.
    
    CRITICAL OUTPUT INSTRUCTIONS:
    Return STRICTLY a raw JSON object containing these exact keys:
    1. "summary_markdown": A concise 3-4 sentence cohesive narrative paragraph outlining current progress. Explicitly state the names of the organizations involved. Do NOT use bullet points, and do NOT use markdown bolding (**).
    2. "relationship_health_score": An integer from 1 to 100 evaluating collaboration velocity, response alignment, and trust.
    3. "stagnation_risk": A string matching exactly either "LOW", "MEDIUM", or "HIGH".
    4. "admin_intervention_required": A boolean (true or false) indicating if an ecosystem admin needs to step in to resolve a standstill or contract deadlock.
    5. "action_items": An array of objects each containing "task", "assignee_domain", and "status" ('pending' or 'completed').

    TRANSACTION LEDGER CONTEXT:
    ${historyText}`;

    let summary_markdown = `Active relationship ledger processing with ${allChunks.length} logged data transactions.`;
    let relationship_health_score = 100;
    let stagnation_risk = "LOW";
    let admin_intervention_required = false;
    let action_items: any[] = [{ task: "Review latest transaction timeline", assignee_domain: payload.uploaded_by, status: 'pending' }];
    // --- AI ORCHESTRATION PIPELINE ---
    // Try every available model from the confirmed model list until one succeeds.
    let aiSuccess = false;
    const modelsToAttempt = [
      'gemini-2.0-flash-lite',
      'gemini-2.0-flash',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-flash-latest',
    ];

    for (const modelName of modelsToAttempt) {
      if (aiSuccess) break;
      try {
        console.log(`Attempting AI Studio with model: ${modelName}...`);
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const geminiData = await geminiRes.json();

        if (geminiData.error) {
          console.warn(`Model ${modelName} error: [${geminiData.error.code}] ${geminiData.error.message?.substring(0, 120)}`);
          continue;
        }

        if (geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
          const text = geminiData.candidates[0].content.parts[0].text;
          console.log(`DEBUG: AI Raw Text from ${modelName}:`, text.substring(0, 200));
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const aiExtracted = JSON.parse(jsonMatch[0]);
            summary_markdown = aiExtracted.summary_markdown || summary_markdown;
            relationship_health_score = aiExtracted.relationship_health_score ?? relationship_health_score;
            stagnation_risk = aiExtracted.stagnation_risk || stagnation_risk;
            admin_intervention_required = aiExtracted.admin_intervention_required ?? admin_intervention_required;
            action_items = aiExtracted.action_items || action_items;
            aiSuccess = true;
            console.log(`✅ AI Success via AI Studio (${modelName})!`);
          } else {
            console.warn(`Model ${modelName} returned text but no JSON match.`);
          }
        }
      } catch (e: any) {
        console.warn(`Model ${modelName} threw exception:`, e.message);
      }
    }

    if (!aiSuccess) {
      console.error("❌ All AI models exhausted. Saving default placeholder.");
    }

    // 6. Save Complete Ecosystem Governance Metrics to Firestore
    await firestore.collection('room_summaries').doc(payload.workspace_id).set({
      summary_markdown: summary_markdown.replace(/\*\*/g, ''),
      relationship_health_score,
      stagnation_risk,
      admin_intervention_required,
      action_items,
      updated_at: new Date().toISOString()
    });
    console.log(`Global Summary and Ecosystem Analytics updated for workspace: ${payload.workspace_id}`);

  } catch (error) {
    console.error('Error processing ingestion:', error);
    throw error;
  }
});