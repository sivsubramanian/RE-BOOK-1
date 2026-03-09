/**
 * Review Routes – Post-completion feedback system
 *
 * POST   /api/reviews                – Submit a review
 * GET    /api/reviews/user/:userId   – Get reviews for a user
 * GET    /api/reviews/tx/:txId       – Get reviews for a transaction
 * GET    /api/reviews/stats/:userId  – Get rating stats for a user
 */
import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/** POST /api/reviews – Submit a review (only for completed transactions) */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { transaction_id, target_id, book_id, rating, comment } = req.body;
    const reviewerId = req.user.id;

    if (!transaction_id || !target_id || !book_id || !rating) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    if (reviewerId === target_id) {
      return res.status(400).json({ error: "You cannot review yourself" });
    }

    // Verify transaction is completed and user is part of it
    const tx = await query("SELECT * FROM transactions WHERE id = $1", [transaction_id]);
    if (tx.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const txn = tx.rows[0];
    if (txn.status !== "completed") {
      return res.status(400).json({ error: "Can only review completed transactions" });
    }
    if (txn.buyer_id !== reviewerId && txn.seller_id !== reviewerId) {
      return res.status(403).json({ error: "You are not part of this transaction" });
    }

    // Check for duplicate review
    const existing = await query(
      "SELECT id FROM reviews WHERE transaction_id = $1 AND reviewer_id = $2",
      [transaction_id, reviewerId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "You have already reviewed this transaction" });
    }

    const result = await query(
      `INSERT INTO reviews (transaction_id, reviewer_id, target_id, book_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [transaction_id, reviewerId, target_id, book_id, rating, comment || ""]
    );

    // Notify the target user
    await query(
      `INSERT INTO notifications (user_id, type, title, message, metadata)
       VALUES ($1, 'system', 'New Review', $2, $3)`,
      [
        target_id,
        `You received a ${rating}-star review!`,
        JSON.stringify({ transaction_id, review_id: result.rows[0].id }),
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create review error:", err);
    res.status(500).json({ error: "Failed to create review" });
  }
});

/** GET /api/reviews/user/:userId – Get all reviews for a user */
router.get("/user/:userId", async (req, res) => {
  try {
    const result = await query(
      `SELECT r.*,
              json_build_object('id', u.id, 'email', u.email, 'full_name', u.full_name,
                'avatar_url', u.avatar_url) as reviewer,
              json_build_object('id', bk.id, 'title', bk.title, 'author', bk.author,
                'image_url', bk.image_url) as book
       FROM reviews r
       LEFT JOIN users u ON r.reviewer_id = u.id
       LEFT JOIN books bk ON r.book_id = bk.id
       WHERE r.target_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch user reviews error:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

/** GET /api/reviews/tx/:txId – Get reviews for a transaction */
router.get("/tx/:txId", requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT r.*,
              json_build_object('id', u.id, 'email', u.email, 'full_name', u.full_name,
                'avatar_url', u.avatar_url) as reviewer
       FROM reviews r
       LEFT JOIN users u ON r.reviewer_id = u.id
       WHERE r.transaction_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.txId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch tx reviews error:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

/** GET /api/reviews/stats/:userId – Get rating stats for a user */
router.get("/stats/:userId", async (req, res) => {
  try {
    const result = await query(
      `SELECT
         COUNT(*)::int as review_count,
        COALESCE(ROUND(AVG(rating)::numeric, 1), 0)::float as average_rating
       FROM reviews
       WHERE target_id = $1`,
      [req.params.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Fetch rating stats error:", err);
    res.status(500).json({ error: "Failed to fetch rating stats" });
  }
});

export default router;
