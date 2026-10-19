const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const { SERVER_ID, SERVER_TOKEN, HEARTBEAT_URL } = process.env;
const INTERVAL_MS = 30_000;

if (!SERVER_ID || !SERVER_TOKEN || !HEARTBEAT_URL) {
  throw new Error('Missing SERVER_ID, SERVER_TOKEN, or HEARTBEAT_URL in /etc/parrot-status/.env');
}

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
