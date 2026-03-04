/**
 * RE-BOOK-1 Backend Server
 * 
 * Express + PostgreSQL REST API
 * Replaces Supabase with custom auth (JWT), CRUD, and file uploads.
 */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import bookRoutes from "./routes/books.js";
import transactionRoutes from "./routes/transactions.js";
import favoriteRoutes from "./routes/favorites.js";
import notificationRoutes from "./routes/notifications.js";
import uploadRoutes from "./routes/upload.js";
import adminRoutes from "./routes/admin.js";
import reviewRoutes from "./routes/reviews.js";
import messageRoutes from "./routes/messages.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ───────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:8080")
  .split(",")
  .map((o) => o.trim());

app.use(cors({
  origin(origin, cb) {
    // Allow requests with no origin (curl, mobile apps, health checks)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

// Serve uploaded images as static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Routes ──────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/messages", messageRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`🚀 RE-BOOK-1 Backend running on http://localhost:${PORT}`);
});

export default app;
