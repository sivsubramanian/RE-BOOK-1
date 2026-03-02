/**
 * Transaction API Service – P2P book exchange operations
 * 
 * Flow: Buyer → Request → Seller Accept/Reject → Complete
 * All protected by Supabase RLS
 */
import { supabase, type DbTransaction } from "@/lib/supabase";

/** Create a new transaction request (buyer → seller) */
export async function createTransaction(
  bookId: string,
  buyerId: string,
  sellerId: string
): Promise<{ data: DbTransaction | null; error: string | null }> {
  // Check if book is still available
  const { data: book } = await supabase
    .from("books")
    .select("status")
    .eq("id", bookId)
    .single();

  if (!book || book.status !== "available") {
    return { data: null, error: "This book is no longer available" };
  }

  // Check for existing active request by this buyer
  const { data: existing } = await supabase
    .from("transactions")
    .select("id")
    .eq("book_id", bookId)
    .eq("buyer_id", buyerId)
    .in("status", ["requested", "accepted"])
    .single();

  if (existing) {
    return { data: null, error: "You already have an active request for this book" };
  }

  // Update book status to 'requested'
  await supabase.from("books").update({ status: "requested" }).eq("id", bookId);

  const { data, error } = await supabase
    .from("transactions")
    .insert([{ book_id: bookId, buyer_id: buyerId, seller_id: sellerId }])
    .select("*, book:books(*), buyer:profiles!buyer_id(*), seller:profiles!seller_id(*)")
    .single();

  return { data: data as DbTransaction | null, error: error?.message ?? null };
}

/** Seller accepts a request */
export async function acceptTransaction(
  txId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("transactions")
    .update({ status: "accepted" })
    .eq("id", txId);
  return { error: error?.message ?? null };
}

/** Seller rejects a request */
export async function rejectTransaction(
  txId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("transactions")
    .update({ status: "rejected" })
    .eq("id", txId);
  return { error: error?.message ?? null };
}

/** Buyer cancels their request */
export async function cancelTransaction(
  txId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("transactions")
    .update({ status: "cancelled" })
    .eq("id", txId);
  return { error: error?.message ?? null };
}

/** Mark transaction as completed */
export async function completeTransaction(
  txId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("transactions")
    .update({ status: "completed" })
    .eq("id", txId);
  return { error: error?.message ?? null };
}

/** Fetch transactions for a user (as buyer or seller) */
export async function fetchUserTransactions(
  userId: string,
  role: "buyer" | "seller" | "all" = "all"
): Promise<DbTransaction[]> {
  let query = supabase
    .from("transactions")
    .select("*, book:books(*), buyer:profiles!buyer_id(*), seller:profiles!seller_id(*)");

  if (role === "buyer") {
    query = query.eq("buyer_id", userId);
  } else if (role === "seller") {
    query = query.eq("seller_id", userId);
  } else {
    query = query.or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as DbTransaction[];
}

/** Check if a user has an active request for a book */
export async function hasActiveRequest(
  bookId: string,
  buyerId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("transactions")
    .select("id")
    .eq("book_id", bookId)
    .eq("buyer_id", buyerId)
    .in("status", ["requested", "accepted"])
    .single();
  return !!data;
}

/** Fetch analytics data */
export async function fetchAnalytics(): Promise<any> {
  const { data, error } = await supabase.rpc("get_analytics");
  if (error) {
    // Fallback: compute on client side
    const { data: books } = await supabase.from("books").select("*");
    const { data: txns } = await supabase.from("transactions").select("*");
    const { data: users } = await supabase.from("profiles").select("*");

    const booksArr = books || [];
    const txnsArr = txns || [];
    const usersArr = users || [];

    // Compute department distribution
    const deptMap: Record<string, number> = {};
    booksArr.forEach((b: any) => {
      deptMap[b.department] = (deptMap[b.department] || 0) + 1;
    });
    const deptDist = Object.entries(deptMap).map(([department, count]) => ({ department, count }));
    const topDept = deptDist.sort((a, b) => b.count - a.count)[0]?.department || "N/A";

    return {
      total_books: booksArr.length,
      total_users: usersArr.length,
      avg_price: booksArr.length ? Math.round(booksArr.reduce((s: number, b: any) => s + Number(b.price), 0) / booksArr.length) : 0,
      total_transactions: txnsArr.length,
      completed_transactions: txnsArr.filter((t: any) => t.status === "completed").length,
      most_demanded_dept: topDept,
      dept_distribution: deptDist,
      monthly_listings: [],
    };
  }
  return data;
}
