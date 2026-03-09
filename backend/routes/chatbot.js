/**
 * Chatbot API – returns recommendation-backed responses.
 */
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { recommendBooks } from "../services/recommendation.js";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
  try {
    const { query = "", genre = "", limit = 6 } = req.body || {};
    const textQuery = String(query || genre || "").trim();

    const books = await recommendBooks(req.user.id, textQuery, Number(limit) || 6);

    res.json({
      query: textQuery,
      count: books.length,
      message:
        books.length > 0
          ? "Here are some books you may like based on your interests."
          : "I could not find matching books right now. Try a broader keyword.",
      books,
    });
  } catch (err) {
    console.error("Chatbot recommendation error:", err);
    res.status(500).json({ error: "Failed to fetch recommendations" });
  }
});

export default router;
