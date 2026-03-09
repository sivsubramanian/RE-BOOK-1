/**
 * Message Routes – Buyer-seller in-app chat per transaction
 *
 * GET    /api/messages/:transactionId – Get messages for a transaction
 * POST   /api/messages               – Send a message
 */
import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/** GET /api/messages/:transactionId – Get messages for a transaction */
router.get("/:transactionId", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { transactionId } = req.params;

    // Verify user is part of this transaction
    const tx = await query(
      "SELECT buyer_id, seller_id FROM transactions WHERE id = $1",
      [transactionId]
    );
    if (tx.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    if (tx.rows[0].buyer_id !== userId && tx.rows[0].seller_id !== userId) {
      return res.status(403).json({ error: "You are not part of this transaction" });
    }

    const result = await query(
      `SELECT m.*,
              COALESCE(m.message, m.content) as content,
              json_build_object('id', u.id, 'full_name', u.full_name,
                'avatar_url', u.avatar_url) as sender
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.transaction_id = $1
       ORDER BY m.created_at ASC`,
      [transactionId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch messages error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/** POST /api/messages – Send a message */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { transaction_id, content } = req.body;
    const senderId = req.user.id;

    if (!transaction_id || !content?.trim()) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify user is part of this transaction
    const tx = await query(
      "SELECT buyer_id, seller_id FROM transactions WHERE id = $1",
      [transaction_id]
    );
    if (tx.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    const { buyer_id, seller_id } = tx.rows[0];
    if (buyer_id !== senderId && seller_id !== senderId) {
      return res.status(403).json({ error: "You are not part of this transaction" });
    }

    const recipientId = senderId === buyer_id ? seller_id : buyer_id;

    const result = await query(
      `INSERT INTO messages (transaction_id, sender_id, receiver_id, content, message)
       VALUES ($1, $2, $3, $4, $4) RETURNING *`,
      [transaction_id, senderId, recipientId, content.trim()]
    );

    // Notify the other party
    await query(
      `INSERT INTO notifications (user_id, type, title, message, metadata)
       VALUES ($1, 'system', 'New Message', 'You have a new message about a book exchange', $2)`,
      [recipientId, JSON.stringify({ transaction_id })]
    );

    // Return message with sender info
    const full = await query(
      `SELECT m.*,
              COALESCE(m.message, m.content) as content,
              json_build_object('id', u.id, 'full_name', u.full_name,
                'avatar_url', u.avatar_url) as sender
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.id = $1`,
      [result.rows[0].id]
    );

    const payload = full.rows[0];
    req.app.locals.io?.to(`tx:${transaction_id}`).emit("message:new", payload);

    res.status(201).json(payload);
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
