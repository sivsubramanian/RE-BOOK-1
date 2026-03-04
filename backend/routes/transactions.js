/**
 * Transaction Routes – P2P book exchange flow
 * 
 * POST   /api/transactions           – Request a book
 * GET    /api/transactions           – Get user transactions
 * PUT    /api/transactions/:id/accept   – Accept request (seller)
 * PUT    /api/transactions/:id/reject   – Reject request (seller)
 * PUT    /api/transactions/:id/cancel   – Cancel request (buyer)
 * PUT    /api/transactions/:id/complete – Complete exchange
 * GET    /api/transactions/active/:bookId – Check active request
 * GET    /api/transactions/analytics  – Platform analytics
 */
import { Router } from "express";
import { query, getClient } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/** Helper: fetch full transaction with joins */
async function fetchFullTransaction(txId) {
  const result = await query(
    `SELECT t.*,
            json_build_object('id', bk.id, 'title', bk.title, 'author', bk.author,
              'description', bk.description, 'department', bk.department, 'semester', bk.semester,
              'condition', bk.condition, 'price', bk.price, 'image_url', bk.image_url,
              'seller_id', bk.seller_id, 'status', bk.status, 'views_count', bk.views_count,
              'created_at', bk.created_at, 'updated_at', bk.updated_at) as book,
            json_build_object('id', bu.id, 'email', bu.email, 'full_name', bu.full_name,
              'department', bu.department, 'semester', bu.semester, 'role', bu.role,
              'avatar_url', bu.avatar_url, 'created_at', bu.created_at) as buyer,
            json_build_object('id', su.id, 'email', su.email, 'full_name', su.full_name,
              'department', su.department, 'semester', su.semester, 'role', su.role,
              'avatar_url', su.avatar_url, 'created_at', su.created_at) as seller
     FROM transactions t
     LEFT JOIN books bk ON t.book_id = bk.id
     LEFT JOIN users bu ON t.buyer_id = bu.id
     LEFT JOIN users su ON t.seller_id = su.id
     WHERE t.id = $1`,
    [txId]
  );
  return result.rows[0] || null;
}

/** POST /api/transactions – Request a book (with row-level locking) */
router.post("/", requireAuth, async (req, res) => {
  const client = await getClient();
  try {
    const { book_id, seller_id } = req.body;
    const buyerId = req.user.id;

    if (buyerId === seller_id) {
      return res.status(400).json({ error: "You can't request your own book" });
    }

    await client.query("BEGIN");

    // Lock the book row to prevent race conditions
    const bookResult = await client.query(
      "SELECT id, status FROM books WHERE id = $1 FOR UPDATE",
      [book_id]
    );

    if (bookResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Book not found" });
    }
    if (bookResult.rows[0].status !== "available") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "This book is no longer available" });
    }

    // Check for existing active request
    const existing = await client.query(
      "SELECT id FROM transactions WHERE book_id = $1 AND buyer_id = $2 AND status IN ('requested', 'accepted')",
      [book_id, buyerId]
    );
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "You already have an active request for this book" });
    }

    // Update book status
    await client.query("UPDATE books SET status = 'requested' WHERE id = $1", [book_id]);

    // Create transaction
    const txResult = await client.query(
      `INSERT INTO transactions (book_id, buyer_id, seller_id, status)
       VALUES ($1, $2, $3, 'requested') RETURNING id`,
      [book_id, buyerId, seller_id]
    );

    // Create notification for seller
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, metadata)
       VALUES ($1, 'transaction_update', 'New Book Request',
               'Someone has requested one of your books', $2)`,
      [seller_id, JSON.stringify({ transaction_id: txResult.rows[0].id, book_id })]
    );

    await client.query("COMMIT");

    const fullTx = await fetchFullTransaction(txResult.rows[0].id);
    res.status(201).json(fullTx);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Create transaction error:", err);
    res.status(500).json({ error: "Failed to create transaction" });
  } finally {
    client.release();
  }
});

/** GET /api/transactions – Get user's transactions */
router.get("/", requireAuth, async (req, res) => {
  try {
    const { role = "all" } = req.query;
    const userId = req.user.id;

    let whereClause;
    const values = [];
    if (role === "buyer") {
      whereClause = "WHERE t.buyer_id = $1";
      values.push(userId);
    } else if (role === "seller") {
      whereClause = "WHERE t.seller_id = $1";
      values.push(userId);
    } else {
      whereClause = "WHERE (t.buyer_id = $1 OR t.seller_id = $1)";
      values.push(userId);
    }

    const result = await query(
      `SELECT t.*,
              json_build_object('id', bk.id, 'title', bk.title, 'author', bk.author,
                'description', bk.description, 'department', bk.department, 'semester', bk.semester,
                'condition', bk.condition, 'price', bk.price, 'image_url', bk.image_url,
                'seller_id', bk.seller_id, 'status', bk.status, 'views_count', bk.views_count,
                'created_at', bk.created_at, 'updated_at', bk.updated_at) as book,
              json_build_object('id', bu.id, 'email', bu.email, 'full_name', bu.full_name,
                'department', bu.department, 'semester', bu.semester, 'role', bu.role,
                'avatar_url', bu.avatar_url, 'created_at', bu.created_at) as buyer,
              json_build_object('id', su.id, 'email', su.email, 'full_name', su.full_name,
                'department', su.department, 'semester', su.semester, 'role', su.role,
                'avatar_url', su.avatar_url, 'created_at', su.created_at) as seller
       FROM transactions t
       LEFT JOIN books bk ON t.book_id = bk.id
       LEFT JOIN users bu ON t.buyer_id = bu.id
       LEFT JOIN users su ON t.seller_id = su.id
       ${whereClause}
       ORDER BY t.created_at DESC`,
      values
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch transactions error:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

/** PUT /api/transactions/:id/accept */
router.put("/:id/accept", requireAuth, async (req, res) => {
  try {
    const tx = await query("SELECT * FROM transactions WHERE id = $1", [req.params.id]);
    if (tx.rows.length === 0) return res.status(404).json({ error: "Transaction not found" });
    if (tx.rows[0].seller_id !== req.user.id) return res.status(403).json({ error: "Not authorized" });
    if (tx.rows[0].status !== "requested") return res.status(400).json({ error: "Can only accept requested transactions" });

    await query("UPDATE transactions SET status = 'accepted' WHERE id = $1", [req.params.id]);

    // Notify buyer
    await query(
      `INSERT INTO notifications (user_id, type, title, message, metadata)
       VALUES ($1, 'transaction_update', 'Request Accepted', 'Your book request has been accepted!', $2)`,
      [tx.rows[0].buyer_id, JSON.stringify({ transaction_id: req.params.id })]
    );

    res.json({ message: "Transaction accepted" });
  } catch (err) {
    console.error("Accept error:", err);
    res.status(500).json({ error: "Failed to accept transaction" });
  }
});

/** PUT /api/transactions/:id/reject */
router.put("/:id/reject", requireAuth, async (req, res) => {
  try {
    const tx = await query("SELECT * FROM transactions WHERE id = $1", [req.params.id]);
    if (tx.rows.length === 0) return res.status(404).json({ error: "Transaction not found" });
    if (tx.rows[0].seller_id !== req.user.id) return res.status(403).json({ error: "Not authorized" });

    await query("UPDATE transactions SET status = 'rejected' WHERE id = $1", [req.params.id]);
    // Set book back to available
    await query("UPDATE books SET status = 'available' WHERE id = $1", [tx.rows[0].book_id]);

    // Notify buyer
    await query(
      `INSERT INTO notifications (user_id, type, title, message, metadata)
       VALUES ($1, 'transaction_update', 'Request Rejected', 'Your book request has been rejected', $2)`,
      [tx.rows[0].buyer_id, JSON.stringify({ transaction_id: req.params.id })]
    );

    res.json({ message: "Transaction rejected" });
  } catch (err) {
    console.error("Reject error:", err);
    res.status(500).json({ error: "Failed to reject transaction" });
  }
});

/** PUT /api/transactions/:id/cancel */
router.put("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const tx = await query("SELECT * FROM transactions WHERE id = $1", [req.params.id]);
    if (tx.rows.length === 0) return res.status(404).json({ error: "Transaction not found" });
    if (tx.rows[0].buyer_id !== req.user.id) return res.status(403).json({ error: "Not authorized" });

    await query("UPDATE transactions SET status = 'cancelled' WHERE id = $1", [req.params.id]);
    await query("UPDATE books SET status = 'available' WHERE id = $1", [tx.rows[0].book_id]);

    res.json({ message: "Transaction cancelled" });
  } catch (err) {
    console.error("Cancel error:", err);
    res.status(500).json({ error: "Failed to cancel transaction" });
  }
});

/** PUT /api/transactions/:id/complete */
router.put("/:id/complete", requireAuth, async (req, res) => {
  try {
    const tx = await query("SELECT * FROM transactions WHERE id = $1", [req.params.id]);
    if (tx.rows.length === 0) return res.status(404).json({ error: "Transaction not found" });
    if (tx.rows[0].seller_id !== req.user.id) return res.status(403).json({ error: "Not authorized" });
    if (tx.rows[0].status !== "accepted") return res.status(400).json({ error: "Can only complete accepted transactions" });

    await query("UPDATE transactions SET status = 'completed' WHERE id = $1", [req.params.id]);
    await query("UPDATE books SET status = 'sold' WHERE id = $1", [tx.rows[0].book_id]);

    // Notify buyer
    await query(
      `INSERT INTO notifications (user_id, type, title, message, metadata)
       VALUES ($1, 'transaction_update', 'Exchange Complete!', 'Your book exchange has been completed!', $2)`,
      [tx.rows[0].buyer_id, JSON.stringify({ transaction_id: req.params.id })]
    );

    res.json({ message: "Transaction completed" });
  } catch (err) {
    console.error("Complete error:", err);
    res.status(500).json({ error: "Failed to complete transaction" });
  }
});

/** GET /api/transactions/active/:bookId – Check for active request */
router.get("/active/:bookId", requireAuth, async (req, res) => {
  try {
    const result = await query(
      "SELECT id FROM transactions WHERE book_id = $1 AND buyer_id = $2 AND status IN ('requested', 'accepted')",
      [req.params.bookId, req.user.id]
    );
    res.json({ hasActive: result.rows.length > 0 });
  } catch (err) {
    console.error("Active check error:", err);
    res.status(500).json({ error: "Failed to check active request" });
  }
});

/** GET /api/transactions/analytics – Platform analytics */
router.get("/analytics", async (_req, res) => {
  try {
    const [booksRes, usersRes, txRes] = await Promise.all([
      query("SELECT department, price, created_at FROM books"),
      query("SELECT COUNT(*) FROM users"),
      query("SELECT status FROM transactions"),
    ]);

    const books = booksRes.rows;
    const totalUsers = parseInt(usersRes.rows[0].count, 10);
    const txns = txRes.rows;

    // Department distribution
    const deptMap = {};
    books.forEach(b => {
      deptMap[b.department] = (deptMap[b.department] || 0) + 1;
    });
    const deptDist = Object.entries(deptMap).map(([department, count]) => ({ department, count }));
    const topDept = deptDist.sort((a, b) => b.count - a.count)[0]?.department || "N/A";

    // Monthly listings
    const monthMap = {};
    books.forEach(b => {
      const month = new Date(b.created_at).toISOString().slice(0, 7);
      monthMap[month] = (monthMap[month] || 0) + 1;
    });
    const monthlyListings = Object.entries(monthMap)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const avgPrice = books.length
      ? Math.round(books.reduce((s, b) => s + Number(b.price), 0) / books.length)
      : 0;

    res.json({
      total_books: books.length,
      total_users: totalUsers,
      avg_price: avgPrice,
      total_transactions: txns.length,
      completed_transactions: txns.filter(t => t.status === "completed").length,
      most_demanded_dept: topDept,
      dept_distribution: deptDist,
      monthly_listings: monthlyListings,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

export default router;
