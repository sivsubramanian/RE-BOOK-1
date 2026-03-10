/**
 * Database Connection – PostgreSQL via pg Pool
 */
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const shouldUseSSL =
  process.env.NODE_ENV === "production" ||
  process.env.PGSSLMODE === "require" ||
  process.env.DATABASE_SSL === "true" ||
  /render\.com/i.test(connectionString || "");

const pool = new pg.Pool({
  connectionString,
  ssl: shouldUseSSL ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("Unexpected pool error:", err);
});

/**
 * Execute a query with parameters
 */
export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== "production" && duration > 100) {
    console.log(`Slow query (${duration}ms):`, text.substring(0, 80));
  }
  return res;
}

/**
 * Get a client from the pool (for transactions)
 */
export async function getClient() {
  return pool.connect();
}

export default pool;
