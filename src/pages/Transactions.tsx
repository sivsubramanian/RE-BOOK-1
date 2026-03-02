/**
 * Transactions Page – Full transaction history with action buttons
 *
 * Shows all transactions for the current user (as buyer and seller)
 * with accept / reject / cancel / complete actions based on role + status
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeftRight, Loader2, Check, XCircle, X as XIcon, BookOpen, Clock,
} from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";

const statusBadge: Record<string, string> = {
  requested: "bg-yellow-500/20 text-yellow-400",
  accepted: "bg-primary/20 text-primary",
  rejected: "bg-red-500/20 text-red-400",
  completed: "bg-secondary/20 text-secondary",
  cancelled: "bg-muted text-muted-foreground",
};

const filterTabs = ["All", "Requested", "Accepted", "Completed", "Rejected", "Cancelled"];

const Transactions = () => {
  const { user } = useAuth();
  const { transactions, loading, accept, reject, cancel, complete } = useTransactions("all");
  const [filter, setFilter] = useState("All");

  const filtered = useMemo(() => {
    if (filter === "All") return transactions;
    return transactions.filter(t => t.status === filter.toLowerCase());
  }, [transactions, filter]);

  return (
    <div className="min-h-screen pt-14 sm:pt-16 lg:pt-20 pb-8 sm:pb-12">
      <div className="max-w-4xl mx-auto px-3 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1">
            Transactions
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mb-6">
            Track all your book exchange requests
          </p>
        </motion.div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                filter === tab
                  ? "gradient-btn"
                  : "glass-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
              {tab !== "All" && (
                <span className="ml-1.5 text-xs opacity-60">
                  ({transactions.filter(t =>
                    tab === "All" ? true : t.status === tab.toLowerCase()
                  ).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-8 rounded-2xl text-center">
            <ArrowLeftRight className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium mb-1">No transactions</p>
            <p className="text-muted-foreground text-sm">
              {filter === "All"
                ? "Request a book from the search page to get started"
                : `No ${filter.toLowerCase()} transactions`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((tx, i) => {
              const isBuyer = tx.buyer_id === user?.id;
              const isSeller = tx.seller_id === user?.id;

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-card-hover p-4 sm:p-5 rounded-xl sm:rounded-2xl"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Book image */}
                    {tx.book && (
                      <Link to={`/book/${tx.book.id}`} className="flex-shrink-0">
                        <img
                          src={tx.book.image_url}
                          alt={tx.book.title}
                          className="w-12 h-16 sm:w-14 sm:h-20 rounded-lg object-cover"
                          loading="lazy"
                        />
                      </Link>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            to={`/book/${tx.book_id}`}
                            className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
                          >
                            {tx.book?.title || "Book"}
                          </Link>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {tx.book?.author || ""}
                            {tx.book?.price ? ` · ₹${tx.book.price}` : ""}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap ${
                            statusBadge[tx.status] || ""
                          }`}
                        >
                          {tx.status}
                        </span>
                      </div>

                      {/* Role info */}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        {isBuyer && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            You requested from {tx.seller?.full_name || "Seller"}
                          </span>
                        )}
                        {isSeller && !isBuyer && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {tx.buyer?.full_name || "Buyer"} requested this
                          </span>
                        )}
                        <span className="flex items-center gap-1 ml-auto">
                          <Clock className="w-3 h-3" />
                          {new Date(tx.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 mt-3">
                        {/* Seller can accept/reject requested items */}
                        {isSeller && tx.status === "requested" && (
                          <>
                            <button
                              onClick={() => accept(tx.id)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-xs font-medium"
                            >
                              <Check className="w-3.5 h-3.5" /> Accept
                            </button>
                            <button
                              onClick={() => reject(tx.id)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-xs font-medium"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        )}

                        {/* Seller can complete accepted items */}
                        {isSeller && tx.status === "accepted" && (
                          <button
                            onClick={() => complete(tx.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-xs font-medium"
                          >
                            <Check className="w-3.5 h-3.5" /> Mark Complete
                          </button>
                        )}

                        {/* Buyer can cancel their request */}
                        {isBuyer && ["requested", "accepted"].includes(tx.status) && (
                          <button
                            onClick={() => cancel(tx.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors text-xs font-medium"
                          >
                            <XIcon className="w-3.5 h-3.5" /> Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;
