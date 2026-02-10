import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, "..");

const configuredDbPath = (process.env.DB_PATH || "").trim();
const dbPath = configuredDbPath
  ? (path.isAbsolute(configuredDbPath)
      ? configuredDbPath
      : path.join(serverDir, configuredDbPath))
  : path.join(serverDir, "data", "farmbarn.db");

const backupDir = (process.env.DB_BACKUP_DIR || "").trim()
  ? path.resolve(serverDir, process.env.DB_BACKUP_DIR)
  : path.join(serverDir, "data", "backups");
const keep = Number(process.env.DB_BACKUP_KEEP || 14);

if (!fs.existsSync(dbPath)) {
  console.error(`Database file not found: ${dbPath}`);
  process.exit(1);
}
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

const ts = new Date().toISOString().replace(/[:.]/g, "-");
const target = path.join(backupDir, `farmbarn-${ts}.db`);
fs.copyFileSync(dbPath, target);
console.log(`Backup created: ${target}`);

const backups = fs
  .readdirSync(backupDir)
  .filter((f) => f.endsWith(".db"))
  .map((f) => ({
    file: f,
    full: path.join(backupDir, f),
    mtime: fs.statSync(path.join(backupDir, f)).mtimeMs,
  }))
  .sort((a, b) => b.mtime - a.mtime);

if (Number.isFinite(keep) && keep > 0 && backups.length > keep) {
  for (const old of backups.slice(keep)) {
    fs.unlinkSync(old.full);
    console.log(`Pruned old backup: ${old.file}`);
  }
}
