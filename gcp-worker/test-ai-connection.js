
const HARDCODED_KEY = "AIzaSyB0X4ns3Pqssz4Neclprw6-tFxKcz0_4ic";

async function testAI() {
    console.log("--- STARTING AI CONNECTION TEST ---");
    console.log("Using API Key:", HARDCODED_KEY.substring(0, 5) + "...");
    
    try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${HARDCODED_KEY}`;
        console.log("Targeting URL:", geminiUrl.split('?')[0]);
        
        const res = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello AI, please respond with a JSON object containing a 'status' field set to 'success'." }] }]
            })
        });
        
        console.log("Response Status:", res.status);
        const data = await res.json();
        console.log("Full Data Received:", JSON.stringify(data, null, 2));
        
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            console.log("✅ SUCCESS: AI responded!");
            console.log("Text:", data.candidates[0].content.parts[0].text);
        } else {
            console.error("❌ FAILURE: No candidates in response.");
            if (data.error) {
                console.error("Error Detail:", data.error.message);
            }
        }
    } catch (err) {
        console.error("❌ CRITICAL ERROR during fetch:", err);
    }
}

testAI();
