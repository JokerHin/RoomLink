
const HARDCODED_KEY = "AIzaSyB0X4ns3Pqssz4Neclprw6-tFxKcz0_4ic";

async function listModels() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${HARDCODED_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(err);
    }
}

listModels();
