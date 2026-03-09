/**
 * Transaction API Service – P2P book exchange operations
 * 
 * Flow: Buyer → Request → Seller Accept/Reject → Complete
 * All protected by JWT auth
 */
import { apiFetch } from "@/lib/api";
import type { DbTransaction } from "@/types";

/**
 * Create a new transaction request (buyer → seller)
 * Uses server-side row-level locking to prevent race conditions.
 */
export async function createTransaction(
  bookId: string,
  buyerId: string,
  sellerId: string
): Promise<{ data: DbTransaction | null; error: string | null }> {
  try {
    const data = await apiFetch<DbTransaction>("/transactions", {
      method: "POST",
      body: JSON.stringify({ book_id: bookId, buyer_id: buyerId, seller_id: sellerId }),
    });
    return { data, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to create transaction" };
  }
}

/** Seller accepts a request */
export async function acceptTransaction(
  txId: string
): Promise<{ error: string | null }> {
  try {
    await apiFetch(`/transactions/${txId}/accept`, { method: "PUT" });
    return { error: null };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to accept" };
  }
}

/** Seller rejects a request */
export async function rejectTransaction(
  txId: string
): Promise<{ error: string | null }> {
  try {
    await apiFetch(`/transactions/${txId}/reject`, { method: "PUT" });
    return { error: null };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to reject" };
  }
}

/** Buyer cancels their request */
export async function cancelTransaction(
  txId: string
): Promise<{ error: string | null }> {
  try {
    await apiFetch(`/transactions/${txId}/cancel`, { method: "PUT" });
    return { error: null };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to cancel" };
  }
}

/** Mark transaction as completed */
export async function completeTransaction(
  txId: string
): Promise<{ error: string | null }> {
  try {
    await apiFetch(`/transactions/${txId}/complete`, { method: "PUT" });
    return { error: null };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to complete" };
  }
}

/** Seller marks book as given */
export async function bookGivenTransaction(
  txId: string
): Promise<{ error: string | null }> {
  try {
    await apiFetch(`/transactions/${txId}/book-given`, { method: "PUT" });
    return { error: null };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to mark book as given" };
  }
}

/** Buyer confirms book received (auto-completes) */
export async function receivedTransaction(
  txId: string
): Promise<{ error: string | null }> {
  try {
    await apiFetch(`/orders/${txId}/received`, { method: "PATCH" });
    return { error: null };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to confirm receipt" };
  }
}

/** Fetch transactions for a user (as buyer or seller) */
export async function fetchUserTransactions(
  _userId: string,
  role: "buyer" | "seller" | "all" = "all"
): Promise<DbTransaction[]> {
  return apiFetch<DbTransaction[]>(`/transactions?role=${role}`);
}

/** Check if a user has an active request for a book */
export async function hasActiveRequest(
  bookId: string,
  _buyerId: string
): Promise<boolean> {
  try {
    const data = await apiFetch<{ hasActive: boolean }>(`/transactions/active/${bookId}`);
    return data.hasActive;
  } catch {
    return false;
  }
}

/** Fetch analytics data */
export async function fetchAnalytics(): Promise<Record<string, unknown>> {
  return apiFetch("/transactions/analytics", { noAuth: true });
}
