const sqlite = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../../data/status.db");
const schemaPath = path.join(__dirname, "schema.sql");

const db = new sqlite(dbPath);

const schema = fs.readFileSync(schemaPath, "utf8");

db.pragma("journal_mode = WAL");

db.exec(schema);

const serverColumns = db.prepare("PRAGMA table_info(servers)").all();
if (!serverColumns.some((column) => column.name === "uptime_reset_at")) {
  db.exec("ALTER TABLE servers ADD COLUMN uptime_reset_at INTEGER");
}
db.exec("UPDATE servers SET uptime_reset_at = created_at WHERE uptime_reset_at IS NULL");

module.exports = db;
