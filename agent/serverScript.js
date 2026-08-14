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
        status: 'online',
        id: SERVER_ID,
        metrics: {}
      })
    })
  }
}
