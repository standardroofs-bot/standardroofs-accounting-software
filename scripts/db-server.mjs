import EmbeddedPostgres from "embedded-postgres";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

const dataDir = path.resolve(process.cwd(), ".pgdata");
const port = parseInt(process.env.PGPORT || "54329", 10);
const user = process.env.PGUSER || "postgres";
const password = process.env.PGPASSWORD || "srbooks_password_2026";
const database = process.env.PGDATABASE || "srbooks";

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  port: port,
  user: user,
  password: password,
  persistent: true,
});

async function main() {
  const action = process.argv[2] || "start";

  if (action === "start") {
    console.log(`[SR-Books DB] Initializing PostgreSQL cluster at ${dataDir}...`);
    try {
      if (!fs.existsSync(dataDir)) {
        await pg.initialise();
      }
    } catch (e) {
      // already initialized
    }

    console.log(`[SR-Books DB] Starting PostgreSQL on port ${port}...`);
    await pg.start();
    console.log(`[SR-Books DB] PostgreSQL is online on port ${port}!`);

    // Ensure database exists
    try {
      await pg.createDatabase(database);
      console.log(`[SR-Books DB] Database '${database}' created/verified.`);
    } catch (err) {
      // Database might already exist
      console.log(`[SR-Books DB] Database '${database}' ready.`);
    }

    console.log(`[SR-Books DB] Connection URL: postgresql://${user}:${password}@127.0.0.1:${port}/${database}?schema=public`);

    // Keep alive if started directly
    if (process.argv.includes("--daemon") || process.argv.includes("-d")) {
      console.log("[SR-Books DB] Running in daemon mode. Press Ctrl+C to stop.");
      process.on("SIGINT", async () => {
        console.log("[SR-Books DB] Stopping PostgreSQL server...");
        await pg.stop();
        process.exit(0);
      });
      process.on("SIGTERM", async () => {
        await pg.stop();
        process.exit(0);
      });
      // Keep node process alive
      setInterval(() => {}, 1000 * 60 * 60);
    }
  } else if (action === "stop") {
    console.log("[SR-Books DB] Stopping PostgreSQL server...");
    await pg.stop();
    console.log("[SR-Books DB] PostgreSQL stopped.");
  }
}

main().catch((err) => {
  console.error("[SR-Books DB] Error:", err);
  process.exit(1);
});
