/**
 * Favorites API Service – REST API backed favorites
 */
import { apiFetch } from "@/lib/api";
import type { DbBook } from "@/types";

export interface DbFavorite {
  id: string;
  user_id: string;
  book_id: string;
  created_at: string;
  book?: DbBook;
}

/** Fetch all favorites for the current user (with book data) */
export async function fetchFavorites(_userId: string): Promise<DbFavorite[]> {
  return apiFetch<DbFavorite[]>("/favorites");
}

/** Check if a book is favorited by the user */
export async function isFavorited(_userId: string, bookId: string): Promise<boolean> {
  try {
    const ids = await apiFetch<string[]>("/favorites/ids");
    return ids.includes(bookId);
  } catch {
    return false;
  }
}

/** Fetch all favorited book IDs for a user (lightweight) */
export async function fetchFavoriteIds(_userId: string): Promise<Set<string>> {
  try {
    const ids = await apiFetch<string[]>("/favorites/ids");
    return new Set(ids);
  } catch {
    return new Set();
  }
}

/** Add a book to favorites */
export async function addFavorite(
  _userId: string,
  bookId: string
): Promise<{ error: string | null }> {
  try {
    await apiFetch("/favorites", {
      method: "POST",
      body: JSON.stringify({ book_id: bookId }),
    });
    return { error: null };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to add favorite" };
  }
}

/** Remove a book from favorites */
export async function removeFavorite(
  _userId: string,
  bookId: string
): Promise<{ error: string | null }> {
  try {
    await apiFetch(`/favorites/${bookId}`, { method: "DELETE" });
    return { error: null };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to remove favorite" };
  }
}

/** Toggle favorite (add/remove) */
export async function toggleFavorite(
  userId: string,
  bookId: string,
  isFav: boolean
): Promise<{ error: string | null }> {
  return isFav ? removeFavorite(userId, bookId) : addFavorite(userId, bookId);
}
