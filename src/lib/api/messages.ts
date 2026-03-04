/**
 * Messages API Service – Buyer-seller chat per transaction
 */
import { apiFetch } from "@/lib/api";
import type { DbMessage } from "@/types";

/** Fetch messages for a transaction */
export async function fetchMessages(transactionId: string): Promise<DbMessage[]> {
  return apiFetch<DbMessage[]>(`/messages/${transactionId}`);
}

/** Send a message */
export async function sendMessage(
  transactionId: string,
  content: string
): Promise<{ data: DbMessage | null; error: string | null }> {
  try {
    const msg = await apiFetch<DbMessage>("/messages", {
      method: "POST",
      body: JSON.stringify({ transaction_id: transactionId, content }),
    });
    return { data: msg, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to send message" };
  }
}
