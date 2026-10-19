const express = require("express");
const fs = require("fs");
const path = require("path");
const { consumeInstallToken } = require("./services/serverService");

const app = express();
const PORT = process.env.PORT || 2552;

app.use(express.json());

app.get("/install.sh/:token", (req, res) => {
    const install = consumeInstallToken(req.params.token);
    if (!install) {
        return res.status(404).type("text/plain").send("Installer not found, expired, or already used.\n");
    }

    const template = fs.readFileSync(path.join(__dirname, "../agent/install.sh"), "utf8");
    const heartbeatUrl = `${req.protocol}://${req.get("host")}/heartbeat`;
    const script = template
        .replaceAll("__SERVER_ID__", String(install.server_id))
        .replaceAll("__SERVER_TOKEN__", install.server_token)
        .replaceAll("__HEARTBEAT_URL__", heartbeatUrl);

    res.type("text/plain").send(script);
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
