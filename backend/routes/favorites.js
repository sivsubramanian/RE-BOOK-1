/**
 * Favorites Routes
 * 
 * GET    /api/favorites        – Get user's favorites (with book data)
 * GET    /api/favorites/ids    – Get favorited book IDs (lightweight)
 * POST   /api/favorites        – Add favorite
 * DELETE /api/favorites/:bookId – Remove favorite
 */
import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/** GET /api/favorites – Get favorites with full book data */
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT f.*,
              json_build_object(
                'id', b.id, 'title', b.title, 'author', b.author,
                'description', b.description, 'department', b.department,
                'semester', b.semester, 'condition', b.condition, 'price', b.price,
                'image_url', b.image_url, 'seller_id', b.seller_id,
                'status', b.status, 'views_count', b.views_count,
                'created_at', b.created_at, 'updated_at', b.updated_at,
                'seller', json_build_object(
                  'id', u.id, 'email', u.email, 'full_name', u.full_name,
                  'department', u.department, 'semester', u.semester,
                  'role', u.role, 'avatar_url', u.avatar_url, 'created_at', u.created_at
                )
              ) as book
       FROM favorites f
       LEFT JOIN books b ON f.book_id = b.id
       LEFT JOIN users u ON b.seller_id = u.id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch favorites error:", err);
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
});

/** GET /api/favorites/ids – Get just book IDs */
router.get("/ids", requireAuth, async (req, res) => {
  try {
    const result = await query(
      "SELECT book_id FROM favorites WHERE user_id = $1",
      [req.user.id]
    );
    res.json(result.rows.map(r => r.book_id));
  } catch (err) {
    console.error("Fetch favorite IDs error:", err);
    res.status(500).json({ error: "Failed to fetch favorite IDs" });
  }
});

/** POST /api/favorites – Add a favorite */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { book_id } = req.body;
    await query(
      "INSERT INTO favorites (user_id, book_id) VALUES ($1, $2) ON CONFLICT (user_id, book_id) DO NOTHING",
      [req.user.id, book_id]
    );
    res.status(201).json({ message: "Added to favorites" });
  } catch (err) {
    console.error("Add favorite error:", err);
    res.status(500).json({ error: "Failed to add favorite" });
  }
});

/** DELETE /api/favorites/:bookId – Remove a favorite */
router.delete("/:bookId", requireAuth, async (req, res) => {
  try {
    await query(
      "DELETE FROM favorites WHERE user_id = $1 AND book_id = $2",
      [req.user.id, req.params.bookId]
    );
    res.json({ message: "Removed from favorites" });
  } catch (err) {
    console.error("Remove favorite error:", err);
    res.status(500).json({ error: "Failed to remove favorite" });
  }
});

export default router;
