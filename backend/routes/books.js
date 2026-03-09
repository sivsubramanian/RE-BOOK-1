/**
 * Books API Routes – Full CRUD + search + pagination
 * 
 * GET    /api/books          – List books (filtered, paginated)
 * GET    /api/books/:id      – Get single book
 * POST   /api/books          – Create book (auth required)
 * PUT    /api/books/:id      – Update book (owner only)
 * DELETE /api/books/:id      – Delete book (owner only)
 * POST   /api/books/:id/view – Increment view count
 */
import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";

const router = Router();

/** GET /api/books – List with filters and pagination */
router.get("/", optionalAuth, async (req, res) => {
  try {
    const {
      department, semester, minPrice, maxPrice, condition, status,
      query: searchQuery, sellerId, page = 1, pageSize = 12,
    } = req.query;

    const conditions = [];
    const values = [];
    let idx = 1;

    if (department && department !== "All") {
      conditions.push(`b.department = $${idx++}`);
      values.push(department);
    }
    if (semester) {
      conditions.push(`b.semester = $${idx++}`);
      values.push(Number(semester));
    }
    if (minPrice) {
      conditions.push(`b.price >= $${idx++}`);
      values.push(Number(minPrice));
    }
    if (maxPrice) {
      conditions.push(`b.price <= $${idx++}`);
      values.push(Number(maxPrice));
    }
    if (condition && condition !== "All") {
      conditions.push(`b.condition = $${idx++}`);
      values.push(condition);
    }
    if (status) {
      conditions.push(`b.status = $${idx++}`);
      values.push(status);
    }
    if (sellerId) {
      conditions.push(`b.seller_id = $${idx++}`);
      values.push(sellerId);
    }
    if (searchQuery) {
      conditions.push(`(b.title ILIKE $${idx} OR b.author ILIKE $${idx} OR b.description ILIKE $${idx})`);
      values.push(`%${searchQuery}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const pg = Number(page);
    const ps = Number(pageSize);
    const offset = (pg - 1) * ps;

    // Count total
    const countResult = await query(
      `SELECT COUNT(*) FROM books b ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Fetch books with seller join
    values.push(ps, offset);
    const dataResult = await query(
      `SELECT b.*, 
              rv.average_rating,
              json_build_object(
                'id', u.id, 'email', u.email, 'full_name', u.full_name,
                'department', u.department, 'semester', u.semester,
                'role', u.role, 'avatar_url', u.avatar_url, 'created_at', u.created_at
              ) as seller
       FROM books b
       LEFT JOIN users u ON b.seller_id = u.id
       LEFT JOIN LATERAL (
         SELECT COALESCE(AVG(r.rating), 0)::float as average_rating
         FROM reviews r
         WHERE r.book_id = b.id
       ) rv ON true
       ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      values
    );

    res.json({
      books: dataResult.rows,
      total,
      page: pg,
      pageSize: ps,
      totalPages: Math.ceil(total / ps),
    });
  } catch (err) {
    console.error("Fetch books error:", err);
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

/** GET /api/books/:id – Single book with seller info */
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT b.*, 
              rv.average_rating,
              json_build_object(
                'id', u.id, 'email', u.email, 'full_name', u.full_name,
                'department', u.department, 'semester', u.semester,
                'role', u.role, 'avatar_url', u.avatar_url, 'created_at', u.created_at
              ) as seller
       FROM books b
       LEFT JOIN users u ON b.seller_id = u.id
       LEFT JOIN LATERAL (
         SELECT COALESCE(AVG(r.rating), 0)::float as average_rating
         FROM reviews r
         WHERE r.book_id = b.id
       ) rv ON true
       WHERE b.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Fetch book error:", err);
    res.status(500).json({ error: "Failed to fetch book" });
  }
});

/** POST /api/books – Create a new book listing */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { title, author, description, department, semester, condition, price, image_url } = req.body;

    if (!title?.trim() || !author?.trim()) {
      return res.status(400).json({ error: "Title and author are required" });
    }

    const result = await query(
      `INSERT INTO books (title, author, description, department, semester, condition, price, image_url, seller_id, status, views_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'available', 0)
       RETURNING *`,
      [title.trim(), author.trim(), description || "", department, semester, condition, price, image_url || "", req.user.id]
    );

    // Fetch with seller info
    const bookWithSeller = await query(
      `SELECT b.*, 
              rv.average_rating,
              json_build_object(
                'id', u.id, 'email', u.email, 'full_name', u.full_name,
                'department', u.department, 'semester', u.semester,
                'role', u.role, 'avatar_url', u.avatar_url, 'created_at', u.created_at
              ) as seller
       FROM books b
       LEFT JOIN users u ON b.seller_id = u.id
       LEFT JOIN LATERAL (
         SELECT COALESCE(AVG(r.rating), 0)::float as average_rating
         FROM reviews r
         WHERE r.book_id = b.id
       ) rv ON true
       WHERE b.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(bookWithSeller.rows[0]);
  } catch (err) {
    console.error("Create book error:", err);
    res.status(500).json({ error: "Failed to create book" });
  }
});

/** PUT /api/books/:id – Update book (owner only) */
router.put("/:id", requireAuth, async (req, res) => {
  try {
    // Check ownership
    const book = await query("SELECT seller_id FROM books WHERE id = $1", [req.params.id]);
    if (book.rows.length === 0) return res.status(404).json({ error: "Book not found" });
    if (book.rows[0].seller_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized to update this book" });
    }

    const { title, author, description, department, semester, condition, price, image_url, status } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) { updates.push(`title = $${idx++}`); values.push(title); }
    if (author !== undefined) { updates.push(`author = $${idx++}`); values.push(author); }
    if (description !== undefined) { updates.push(`description = $${idx++}`); values.push(description); }
    if (department !== undefined) { updates.push(`department = $${idx++}`); values.push(department); }
    if (semester !== undefined) { updates.push(`semester = $${idx++}`); values.push(semester); }
    if (condition !== undefined) { updates.push(`condition = $${idx++}`); values.push(condition); }
    if (price !== undefined) { updates.push(`price = $${idx++}`); values.push(price); }
    if (image_url !== undefined) { updates.push(`image_url = $${idx++}`); values.push(image_url); }
    if (status !== undefined) { updates.push(`status = $${idx++}`); values.push(status); }

    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });

    values.push(req.params.id);
    await query(`UPDATE books SET ${updates.join(", ")} WHERE id = $${idx}`, values);

    res.json({ message: "Book updated" });
  } catch (err) {
    console.error("Update book error:", err);
    res.status(500).json({ error: "Failed to update book" });
  }
});

/** DELETE /api/books/:id – Delete book (owner or admin) */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const book = await query("SELECT seller_id FROM books WHERE id = $1", [req.params.id]);
    if (book.rows.length === 0) return res.status(404).json({ error: "Book not found" });
    if (book.rows[0].seller_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized to delete this book" });
    }

    await query("DELETE FROM books WHERE id = $1", [req.params.id]);
    res.json({ message: "Book deleted" });
  } catch (err) {
    console.error("Delete book error:", err);
    res.status(500).json({ error: "Failed to delete book" });
  }
});

/** POST /api/books/:id/view – Increment view count */
router.post("/:id/view", async (req, res) => {
  try {
    await query("UPDATE books SET views_count = views_count + 1 WHERE id = $1", [req.params.id]);
    res.json({ message: "View counted" });
  } catch (err) {
    console.error("View increment error:", err);
    res.status(500).json({ error: "Failed to increment views" });
  }
});

export default router;
