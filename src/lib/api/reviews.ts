/**
 * Reviews API Service – Feedback and rating system
 */
import { apiFetch } from "@/lib/api";
import type { DbReview, RatingStats } from "@/types";

/** Submit a review for a completed transaction */
export async function createReview(data: {
  transaction_id: string;
  target_id: string;
  book_id: string;
  rating: number;
  comment: string;
}): Promise<{ data: DbReview | null; error: string | null }> {
  try {
    const review = await apiFetch<DbReview>("/reviews", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return { data: review, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to submit review" };
  }
}

/** Get all reviews for a user */
export async function fetchUserReviews(userId: string): Promise<DbReview[]> {
  return apiFetch<DbReview[]>(`/reviews/user/${userId}`, { noAuth: true });
}

/** Get reviews for a specific transaction */
export async function fetchTransactionReviews(txId: string): Promise<DbReview[]> {
  return apiFetch<DbReview[]>(`/reviews/tx/${txId}`);
}

/** Get rating stats for a user */
export async function fetchRatingStats(userId: string): Promise<RatingStats> {
  return apiFetch<RatingStats>(`/reviews/stats/${userId}`, { noAuth: true });
}
