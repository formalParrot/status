const express = require("express");
const fs = require("fs");
const path = require("path");
const { getInstallToken, completeInstallToken } = require("./services/serverService");

const app = express();
const PORT = process.env.PORT || 2552;
const PUBLIC_URL = (process.env.PUBLIC_URL || "https://status.justparrot.me").replace(/\/$/, "");
const INSTALLER_VERSION = "2026-10-19-shell-agent-v2";

app.use(express.json());

app.get("/install.sh/health", (req, res) => {
    res.set("Cache-Control", "no-store").json({ installerVersion: INSTALLER_VERSION });
});

app.post("/install.sh/:token/complete", (req, res) => {
    if (!completeInstallToken(req.params.token)) {
        return res.status(404).json({ error: "Installer not found, expired, or already completed" });
    }
    res.status(204).end();
});

app.get("/install.sh/:token", (req, res) => {
    const install = getInstallToken(req.params.token);
    if (!install) {
        return res.status(404).type("text/plain").send("Installer not found, expired, or already used.\n");
    }

    const template = fs.readFileSync(path.join(__dirname, "../agent/install.sh"), "utf8");
    const heartbeatUrl = `${PUBLIC_URL}/heartbeat`;
    const script = template
        .replaceAll("__SERVER_ID__", String(install.server_id))
        .replaceAll("__SERVER_TOKEN__", install.server_token)
        .replaceAll("__HEARTBEAT_URL__", heartbeatUrl)
        .replaceAll("__INSTALL_TOKEN__", req.params.token)
        .replaceAll("__INSTALL_COMPLETE_URL__", `${PUBLIC_URL}/install.sh/${req.params.token}/complete`);

    if (script.includes("__SERVER_ID__") || script.includes("__SERVER_TOKEN__") ||
        script.includes("__HEARTBEAT_URL__") || script.includes("__INSTALL_TOKEN__") ||
        script.includes("__INSTALL_COMPLETE_URL__")) {
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
