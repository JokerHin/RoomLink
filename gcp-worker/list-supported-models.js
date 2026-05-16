
const HARDCODED_KEY = "AIzaSyAJ_i9d0TiltyV_JOgwmvNDSOxym7wdwVQ";

async function listSupportedModels() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${HARDCODED_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (!data.models) {
            console.error("No models found in response:", data);
            return;
        }

        const supported = data.models
            .filter(m => m.supportedGenerationMethods.includes('generateContent'))
            .map(m => m.name);
        
        console.log("SUPPORTED MODELS FOR generateContent:");
        console.log(JSON.stringify(supported, null, 2));
    } catch (err) {
        console.error(err);
    }
}

listSupportedModels();
