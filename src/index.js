const express = require("express");
const fs = require("fs");
const path = require("path");
const { consumeInstallToken } = require("./services/serverService");

const app = express();
const PORT = process.env.PORT || 2552;
const PUBLIC_URL = (process.env.PUBLIC_URL || "https://status.justparrot.me").replace(/\/$/, "");
const INSTALLER_VERSION = "2026-10-19-shell-agent-v2";

app.use(express.json());

app.get("/install.sh/health", (req, res) => {
    res.set("Cache-Control", "no-store").json({ installerVersion: INSTALLER_VERSION });
});

app.get("/install.sh/:token", (req, res) => {
    const install = consumeInstallToken(req.params.token);
    if (!install) {
        return res.status(404).type("text/plain").send("Installer not found, expired, or already used.\n");
    }

    const template = fs.readFileSync(path.join(__dirname, "../agent/install.sh"), "utf8");
    const heartbeatUrl = `${PUBLIC_URL}/heartbeat`;
    const script = template
        .replaceAll("__SERVER_ID__", String(install.server_id))
        .replaceAll("__SERVER_TOKEN__", install.server_token)
        .replaceAll("__HEARTBEAT_URL__", heartbeatUrl);

    if (script.includes("__SERVER_ID__") || script.includes("__SERVER_TOKEN__") || script.includes("__HEARTBEAT_URL__")) {
        return res.status(500).type("text/plain").send("Installer configuration generation failed.\n");
    }

    res.set("X-Installer-Version", INSTALLER_VERSION)
        .set("Cache-Control", "no-store")
        .type("text/plain")
        .send(script);
});

const heartbeat = require("./api/heartbeat");
const status = require("./api/status");
//const servers = require("./api/servers");

app.use("/", status);
app.use("/heartbeat", heartbeat);
//app.use("/status/servers", servers);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
});
