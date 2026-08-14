const sqlite = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../../data/status.db");
const schemaPath = path.join(__dirname, "schema.sql");

const db = new sqlite(dbPath);

const schema = fs.readFileSync(schemaPath, "utf8");

db.pragma("journal_mode = WAL");

db.exec(schema);

module.exports = db;
