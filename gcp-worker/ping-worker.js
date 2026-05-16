const payload = {
  specversion: "1.0",
  type: "google.cloud.pubsub.topic.v1.messagePublished",
  source: "//pubsub.googleapis.com/projects/linkroom-496502/topics/linkroom-ingestion",
  id: "1234",
  time: new Date().toISOString(),
  data: {
    message: {
      data: Buffer.from(JSON.stringify({
        workspace_id: "shared-Sunway-Monash-0850",
        uploaded_by: "Monash",
        source_type: "schedule a meeting",
        raw_text: "hi"
      })).toString('base64'),
      messageId: "1234",
      publishTime: new Date().toISOString()
    },
    subscription: "projects/linkroom-496502/subscriptions/linkroom-local-sub"
  }
};

fetch('http://localhost:8080', {
  method: 'POST',
  headers: { 'Content-Type': 'application/cloudevents+json' },
  body: JSON.stringify(payload)
}).then(async res => {
  console.log("STATUS:", res.status);
  console.log("BODY:", await res.text());
}).catch(console.error);
