/**
 * useTransactions – React hook for P2P transaction management
 */
import { useState, useEffect, useCallback } from "react";
import {
  fetchUserTransactions,
  createTransaction,
  acceptTransaction,
  rejectTransaction,
  cancelTransaction,
  completeTransaction,
  hasActiveRequest,
} from "@/lib/api/transactions";
import { useAuth } from "@/context/AuthContext";
import type { DbTransaction } from "@/lib/supabase";
import { toast } from "sonner";

export function useTransactions(role: "buyer" | "seller" | "all" = "all") {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<DbTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchUserTransactions(user.id, role);
      setTransactions(data);
    } catch (err: any) {
      console.warn("Failed to load transactions:", err.message);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, role]);

  useEffect(() => {
    load();
  }, [load]);

  /** Request a book */
  const requestBook = async (bookId: string, sellerId: string) => {
    if (!user?.id) {
      toast.error("Please login to request a book");
      return false;
    }
    if (user.id === sellerId) {
      toast.error("You can't request your own book");
      return false;
    }

    const { data, error } = await createTransaction(bookId, user.id, sellerId);
    if (error) {
      toast.error(error);
      return false;
    }
    toast.success("Book request sent!");
    await load(); // Refresh
    return true;
  };

  /** Accept a request (seller) */
  const accept = async (txId: string) => {
    const { error } = await acceptTransaction(txId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Request accepted!");
    await load();
  };

  /** Reject a request (seller) */
  const reject = async (txId: string) => {
    const { error } = await rejectTransaction(txId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Request rejected");
    await load();
  };

  /** Cancel a request (buyer) */
  const cancel = async (txId: string) => {
    const { error } = await cancelTransaction(txId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Request cancelled");
    await load();
  };

  /** Complete a transaction (seller) */
  const complete = async (txId: string) => {
    const { error } = await completeTransaction(txId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Transaction completed!");
    await load();
  };

  /** Check if current user has active request for a book */
  const checkActiveRequest = async (bookId: string): Promise<boolean> => {
    if (!user?.id) return false;
    return hasActiveRequest(bookId, user.id);
  };

  return {
    transactions,
    loading,
    refetch: load,
    requestBook,
    accept,
    reject,
    cancel,
    complete,
    checkActiveRequest,
  };
}
