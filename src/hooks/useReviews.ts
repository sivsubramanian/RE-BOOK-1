/**
 * useReviews – React hook for review/rating management
 */
import { useState, useEffect, useCallback } from "react";
import {
  fetchUserReviews,
  fetchTransactionReviews,
  fetchRatingStats,
  createReview,
} from "@/lib/api/reviews";
import type { DbReview, RatingStats } from "@/types";
import { toast } from "sonner";

/** Hook to fetch reviews for a specific user */
export function useUserReviews(userId: string | undefined) {
  const [reviews, setReviews] = useState<DbReview[]>([]);
  const [stats, setStats] = useState<RatingStats>({ review_count: 0, average_rating: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setReviews([]);
      setStats({ review_count: 0, average_rating: 0 });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [revs, st] = await Promise.all([
        fetchUserReviews(userId),
        fetchRatingStats(userId),
      ]);
      setReviews(revs);
      setStats(st);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  return { reviews, stats, loading, refetch: load };
}

/** Hook to fetch reviews for a transaction + submit a review */
export function useTransactionReviews(txId: string | undefined) {
  const [reviews, setReviews] = useState<DbReview[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!txId) return;
    setLoading(true);
    try {
      const revs = await fetchTransactionReviews(txId);
      setReviews(revs);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [txId]);

  useEffect(() => { load(); }, [load]);

  const submitReview = async (data: {
    target_id: string;
    book_id: string;
    rating: number;
    comment: string;
  }) => {
    if (!txId) return false;
    const { error } = await createReview({ ...data, transaction_id: txId });
    if (error) {
      toast.error(error);
      return false;
    }
    toast.success("Review submitted!");
    await load();
    return true;
  };

  return { reviews, loading, submitReview, refetch: load };
}
