const express = require("express");

const app = express();
const PORT = process.env.PORT || 2552;

app.use(express.json());

const heartbeat = require("./api/heartbeat");
const status = require("./api/status");
//const servers = require("./api/servers");

app.use("/", status);
app.use("/heartbeat", heartbeat);
//app.use("/status/servers", servers);

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
