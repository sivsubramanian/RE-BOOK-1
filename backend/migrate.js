/**
 * Database Migration Runner
 * Usage: node migrate.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();

  for (const file of files) {
    console.log(`Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    try {
      await pool.query(sql);
      console.log(`  ✅ ${file} applied successfully`);
    } catch (err) {
      console.error(`  ❌ ${file} failed:`, err.message);
      process.exit(1);
    }
  }

  console.log("\n✅ All migrations applied successfully!");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
