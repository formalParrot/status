require('dotenv').config();

const { SERVER_ID, SERVER_TOKEN, HEARTBEAT_URL } = process.env;
const INTERVAL_MS = 30_000;

async function sendHeartbeat() {
  try {
    const res = await fetch(HEARTBEAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVER_TOKEN}`,
      },
      body: JSON.stringify({
        'status': 'online',
        'id': SERVER_ID,
        'metrics': {}
      })
    });

    if (!res.ok) {
      console.error('Heartbeat rejected:', res.status, await res.text());
    };
  } catch (err) {
    console.log("Failed to Heartbeat:", err.message)
  }
}

sendHeartbeat()
setInterval(sendHeartbeat, INTERVAL_MS)
