/**
 * useFavorites – React hook for managing user favorites with optimistic UI
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchFavoriteIds, toggleFavorite, fetchFavorites, type DbFavorite } from "@/lib/api/favorites";
import { toast } from "sonner";

/** Lightweight hook: just tracks which book IDs are favorited */
export function useFavoriteIds() {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setFavoriteIds(new Set());
      setLoading(false);
      return;
    }
    try {
      const ids = await fetchFavoriteIds(user.id);
      setFavoriteIds(ids);
    } catch {
      setFavoriteIds(new Set());
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  /** Toggle a favorite with optimistic update */
  const toggle = async (bookId: string) => {
    if (!user?.id) {
      toast.error("Please login to save favorites");
      return;
    }

    const wasFav = favoriteIds.has(bookId);

    // Optimistic update
    setFavoriteIds(prev => {
      const next = new Set(prev);
      wasFav ? next.delete(bookId) : next.add(bookId);
      return next;
    });

    const { error } = await toggleFavorite(user.id, bookId, wasFav);
    if (error) {
      // Revert on error
      setFavoriteIds(prev => {
        const next = new Set(prev);
        wasFav ? next.add(bookId) : next.delete(bookId);
        return next;
      });
      toast.error("Failed to update favorite");
    } else {
      toast.success(wasFav ? "Removed from favorites" : "Added to favorites ❤️");
    }
  };

  return { favoriteIds, loading, toggle, refetch: load };
}

/** Full favorites hook: returns complete book data */
export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<DbFavorite[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setFavorites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchFavorites(user.id);
      setFavorites(data);
    } catch {
      setFavorites([]);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  return { favorites, loading, refetch: load };
}
