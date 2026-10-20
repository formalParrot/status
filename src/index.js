const express = require("express");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { getInstallToken, completeInstallToken, getServers } = require("./services/serverService");
const { notifyServer } = require("./services/webhookService");
const crypto = require("crypto");
const { createAdminSession, destroyAdminSession } = require("./middleware/adminSession");

const app = express();
const PORT = process.env.PORT || 2552;
const PUBLIC_URL = (process.env.PUBLIC_URL || "https://status.justparrot.me").replace(/\/$/, "");
const INSTALLER_VERSION = "2026-10-19-shell-agent-v3";

app.use(express.json());
app.use((req, res, next) => {
    req.cookies = {};
    const cookie = req.get("cookie") || "";
    cookie.split(";").forEach((part) => {
        const [key, ...value] = part.trim().split("=");
        if (key) req.cookies[key] = decodeURIComponent(value.join("="));
    });
    next();
});
app.use(express.static(path.join(__dirname, "../public"), { index: "index.html" }));
app.get("/manage", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/manage.html"));
});

app.post("/admin/login", (req, res) => {
    const configured = process.env.ADMIN_KEY || "";
    const provided = String(req.body.pin || "");
    const valid = configured && provided.length === configured.length &&
        crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(configured));
    if (!valid) return res.status(401).json({ error: "Invalid PIN" });
    const session = createAdminSession();
    res.set("Set-Cookie", `parrot-admin-session=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);
    res.json({ ok: true });
});

app.post("/admin/logout", (req, res) => {
    const session = req.cookies["parrot-admin-session"];
    if (session) destroyAdminSession(session);
    res.set("Set-Cookie", "parrot-admin-session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
    res.status(204).end();
});

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
        .replaceAll("__INSTALL_COMPLETE_URL__", `${PUBLIC_URL}/install.sh/${req.params.token}/complete`);

    if (script.includes("__SERVER_ID__") || script.includes("__SERVER_TOKEN__") ||
        script.includes("__HEARTBEAT_URL__") || script.includes("__INSTALL_COMPLETE_URL__")) {
        return res.status(500).type("text/plain").send("Installer configuration generation failed.\n");
    }

    res.set("X-Installer-Version", INSTALLER_VERSION)
        .set("Cache-Control", "no-store")
        .type("text/plain")
        .send(script);
});

const heartbeat = require("./api/heartbeat");
const status = require("./api/status");
const admin = require("./api/admin");
//const servers = require("./api/servers");

app.use("/", status);
app.use("/admin/api", admin);
app.use("/heartbeat", heartbeat);
//app.use("/status/servers", servers);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
});

const lastKnownStatus = new Map();
function checkServerTransitions() {
    getServers().forEach((server) => {
        const previous = lastKnownStatus.get(server.id);
        if (previous && previous !== server.status) {
            notifyServer(server.id, server.status === "online" ? "server online" : "server offline",
                `${server.title || server.name} is now ${server.status}.`).catch(() => {});
        }
        lastKnownStatus.set(server.id, server.status);
    });
}
checkServerTransitions();
setInterval(checkServerTransitions, 30_000);
