/**
 * RE-BOOK-1 Backend Server
 * 
 * Express + PostgreSQL REST API
 * Replaces Supabase with custom auth (JWT), CRUD, and file uploads.
 */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

import authRoutes from "./routes/auth.js";
import bookRoutes from "./routes/books.js";
import transactionRoutes from "./routes/transactions.js";
import favoriteRoutes from "./routes/favorites.js";
import notificationRoutes from "./routes/notifications.js";
import uploadRoutes from "./routes/upload.js";
import adminRoutes from "./routes/admin.js";
import reviewRoutes from "./routes/reviews.js";
import messageRoutes from "./routes/messages.js";
import orderRoutes from "./routes/orders.js";
import chatbotRoutes from "./routes/chatbot.js";
import { query } from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// ── Middleware ───────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:8080")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, "")); // strip trailing slashes

app.use(cors({
  origin(origin, cb) {
    // Allow requests with no origin (curl, mobile apps, health checks)
    if (!origin) return cb(null, true);
    // Exact match OR any *.vercel.app preview deploy
    if (
      allowedOrigins.includes(origin) ||
      /^https:\/\/.*\.vercel\.app$/.test(origin)
    ) {
      return cb(null, true);
    }
    console.warn(`CORS blocked origin: ${origin}`);
    cb(null, false); // reject without throwing (avoids 500)
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

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
app.use("/api/orders", orderRoutes);
app.use("/api/chatbot", chatbotRoutes);

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

const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

app.locals.io = io;

io.on("connection", (socket) => {
  socket.on("join:transaction", (transactionId) => {
    if (transactionId) {
      socket.join(`tx:${transactionId}`);
    }
  });

  socket.on("leave:transaction", (transactionId) => {
    if (transactionId) {
      socket.leave(`tx:${transactionId}`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 RE-BOOK-1 Backend running on http://localhost:${PORT}`);

  // Warm DB connection at startup to avoid first-request latency spikes.
  query("SELECT 1")
    .catch((err) => console.warn("DB warm-up failed:", err?.message || err));
});

export default app;
