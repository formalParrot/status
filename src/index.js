const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 2552;

app.use(express.json());

app.get("/install.sh", (req, res) => {
    res.type("text/plain").sendFile(path.join(__dirname, "../agent/install.sh"));
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
