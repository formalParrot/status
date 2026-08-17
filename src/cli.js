const { createServer } = require("./services/serverService.js")

const serverName = process.argv[2];

createServer(serverName)
