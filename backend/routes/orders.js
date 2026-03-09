/**
 * Orders API – aliases order operations to transactions.
 */
import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/** PATCH /api/orders/:id/received – Buyer marks order as received */
router.patch("/:id/received", requireAuth, async (req, res) => {
  try {
    const tx = await query("SELECT * FROM transactions WHERE id = $1", [req.params.id]);
    if (tx.rows.length === 0) return res.status(404).json({ error: "Order not found" });

    const order = tx.rows[0];
    if (order.buyer_id !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (!["accepted", "requested"].includes(order.status)) {
      return res.status(400).json({ error: "Order is not in a receivable state" });
    }

    await query(
      "UPDATE transactions SET order_status = 'delivered', status = 'completed', updated_at = NOW() WHERE id = $1",
      [req.params.id]
    );
    await query("UPDATE books SET status = 'sold' WHERE id = $1", [order.book_id]);

    res.json({ message: "Order marked as received" });
  } catch (err) {
    console.error("Order received error:", err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

export default router;
