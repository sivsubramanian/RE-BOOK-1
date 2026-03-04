/**
 * Notification Routes
 * 
 * GET  /api/notifications         – Get user's notifications
 * GET  /api/notifications/unread  – Get unread count
 * PUT  /api/notifications/:id/read – Mark one as read
 * PUT  /api/notifications/read-all – Mark all as read
 */
import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/** GET /api/notifications */
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch notifications error:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

/** GET /api/notifications/unread */
router.get("/unread", requireAuth, async (req, res) => {
  try {
    const result = await query(
      "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false",
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error("Unread count error:", err);
    res.status(500).json({ error: "Failed to get unread count" });
  }
});

/** PUT /api/notifications/:id/read */
router.put("/:id/read", requireAuth, async (req, res) => {
  try {
    await query(
      "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    res.json({ message: "Marked as read" });
  } catch (err) {
    console.error("Mark read error:", err);
    res.status(500).json({ error: "Failed to mark as read" });
  }
});

/** PUT /api/notifications/read-all */
router.put("/read-all", requireAuth, async (req, res) => {
  try {
    await query(
      "UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false",
      [req.user.id]
    );
    res.json({ message: "All marked as read" });
  } catch (err) {
    console.error("Mark all read error:", err);
    res.status(500).json({ error: "Failed to mark all as read" });
  }
});

export default router;
