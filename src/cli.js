const { createServer } = require("./services/serverService.js")

const serverName = process.argv[2];

const result = createServer(serverName)

console.log(JSON.stringify(result, null, 2));
