/**
 * Admin Routes – Platform management
 * 
 * GET /api/admin/data – Get all users, books, transactions for admin dashboard
 */
import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

/** GET /api/admin/data – Admin dashboard data */
router.get("/data", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [usersRes, booksRes, txRes] = await Promise.all([
      query(`SELECT id, email, full_name, department, semester, role, avatar_url, created_at
             FROM users ORDER BY created_at DESC`),
      query(`SELECT b.*,
                    json_build_object(
                      'id', u.id, 'email', u.email, 'full_name', u.full_name,
                      'department', u.department, 'semester', u.semester,
                      'role', u.role, 'avatar_url', u.avatar_url, 'created_at', u.created_at
                    ) as seller
             FROM books b LEFT JOIN users u ON b.seller_id = u.id
             ORDER BY b.created_at DESC`),
      query(`SELECT t.*,
                    json_build_object('id', bk.id, 'title', bk.title) as book,
                    json_build_object('id', bu.id, 'full_name', bu.full_name) as buyer,
                    json_build_object('id', su.id, 'full_name', su.full_name) as seller
             FROM transactions t
             LEFT JOIN books bk ON t.book_id = bk.id
             LEFT JOIN users bu ON t.buyer_id = bu.id
             LEFT JOIN users su ON t.seller_id = su.id
             ORDER BY t.created_at DESC`),
    ]);

    res.json({
      users: usersRes.rows,
      books: booksRes.rows,
      transactions: txRes.rows,
    });
  } catch (err) {
    console.error("Admin data error:", err);
    res.status(500).json({ error: "Failed to load admin data" });
  }
});

export default router;
