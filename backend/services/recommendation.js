/**
 * Hybrid recommendation service based on title/description/department similarity
 * plus a lightweight personalization boost from user transaction history.
 */
import { query } from "../db.js";

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function jaccardScore(aTokens, bTokens) {
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  if (a.size === 0 && b.size === 0) return 0;

  let intersection = 0;
  a.forEach((t) => {
    if (b.has(t)) intersection += 1;
  });

  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
}

export async function recommendBooks(userId, keyword = "", limit = 8) {
  const booksRes = await query(
    `SELECT id, title, author, description, department, semester, condition, price, image_url, seller_id, status, views_count, created_at, updated_at
     FROM books
     WHERE status = 'available'
     ORDER BY created_at DESC
     LIMIT 300`
  );

  const books = booksRes.rows;
  if (books.length === 0) return [];

  const txRes = await query(
    `SELECT t.book_id, b.department, b.title, b.description
     FROM transactions t
     LEFT JOIN books b ON b.id = t.book_id
     WHERE t.buyer_id = $1
     ORDER BY t.created_at DESC
     LIMIT 50`,
    [userId]
  );

  const historyDocs = txRes.rows.map((r) => `${r.department || ""} ${r.title || ""} ${r.description || ""}`);
  const historyTokens = tokenize(historyDocs.join(" "));
  const queryTokens = tokenize(keyword);

  const scored = books.map((book) => {
    const bookTokens = tokenize(`${book.department} ${book.title} ${book.description}`);
    const queryScore = queryTokens.length ? jaccardScore(queryTokens, bookTokens) : 0;
    const historyScore = historyTokens.length ? jaccardScore(historyTokens, bookTokens) : 0;
    const popularityScore = Math.min(Number(book.views_count || 0) / 100, 1);

    const score = queryScore * 0.55 + historyScore * 0.35 + popularityScore * 0.1;
    return { ...book, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...book }) => ({ ...book, score: Number(score.toFixed(4)) }));
}
