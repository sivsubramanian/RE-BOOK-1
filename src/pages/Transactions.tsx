/**
 * Transactions Page – Full transaction history with order tracking, chat & reviews
 *
 * Features:
 *  • Filter tabs (All / Active / Completed / Rejected / Cancelled)
 *  • OrderTracker for active & completed transactions
 *  • Inline ChatWindow per transaction (toggle)
 *  • ReviewForm for completed transactions
 *  • Action buttons: accept/reject/cancel/book-given/received
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftRight,
  Loader2,
  Check,
  XCircle,
  X as XIcon,
  BookOpen,
  Clock,
  MessageCircle,
  Package,
  PackageCheck,
  Star,
} from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { useTransactionReviews } from "@/hooks/useReviews";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import OrderTracker from "@/components/OrderTracker";
import ChatWindow from "@/components/ChatWindow";
import ReviewForm from "@/components/ReviewForm";

/* ── helpers ─────────────────────────────────────────── */

const statusBadge: Record<string, string> = {
  requested: "bg-yellow-500/20 text-yellow-400",
  accepted: "bg-primary/20 text-primary",
  rejected: "bg-red-500/20 text-red-400",
  completed: "bg-secondary/20 text-secondary",
  cancelled: "bg-muted text-muted-foreground",
};

const filterTabs = ["All", "Active", "Completed", "Rejected", "Cancelled"] as const;
type Filter = (typeof filterTabs)[number];

function matchesFilter(status: string, filter: Filter): boolean {
  if (filter === "All") return true;
  if (filter === "Active") return ["requested", "accepted"].includes(status);
  return status === filter.toLowerCase();
}

/* ── transaction card sub-component ──────────────────── */

interface TxCardProps {
  tx: ReturnType<typeof useTransactions>["transactions"][number];
  userId: string;
  accept: (id: string) => void;
  reject: (id: string) => void;
  cancel: (id: string) => void;
  complete: (id: string) => void;
  bookGiven: (id: string) => void;
  markReceived: (id: string) => void;
}

const TxCard = ({
  tx,
  userId,
  accept,
  reject,
  cancel,
  complete,
  bookGiven,
  markReceived,
}: TxCardProps) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const isBuyer = tx.buyer_id === userId;
  const isSeller = tx.seller_id === userId;
  const isActive = ["requested", "accepted"].includes(tx.status);
  const isCompleted = tx.status === "completed";

  return (
    <div className="glass-card-hover p-4 sm:p-5 rounded-xl sm:rounded-2xl space-y-3">
      {/* Header row */}
      <div className="flex items-start gap-3 sm:gap-4">
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

          {/* Role + date */}
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
        </div>
      </div>

      {/* Order tracker for non-terminal statuses */}
      {(isActive || isCompleted) && (
        <OrderTracker status={tx.status} orderStatus={tx.order_status} />
      )}

      {/* Action buttons row */}
      <div className="flex flex-wrap gap-2">
        {/* Seller: accept / reject (requested) */}
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

        {/* Seller: book given (accepted, not yet given) */}
        {isSeller && tx.status === "accepted" && tx.order_status !== "book_given" && (
          <button
            onClick={() => bookGiven(tx.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-xs font-medium"
          >
            <Package className="w-3.5 h-3.5" /> Mark Book Given
          </button>
        )}

        {/* Seller: can still directly complete (accepted) */}
        {isSeller && tx.status === "accepted" && (
          <button
            onClick={() => complete(tx.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-xs font-medium"
          >
            <Check className="w-3.5 h-3.5" /> Mark Complete
          </button>
        )}

        {/* Buyer: confirm received (book_given) */}
        {isBuyer && tx.order_status === "book_given" && tx.status === "accepted" && (
          <button
            onClick={() => markReceived(tx.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-xs font-medium"
          >
            <PackageCheck className="w-3.5 h-3.5" /> Confirm Received
          </button>
        )}

        {/* Buyer: cancel (requested or accepted) */}
        {isBuyer && isActive && (
          <button
            onClick={() => cancel(tx.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors text-xs font-medium"
          >
            <XIcon className="w-3.5 h-3.5" /> Cancel
          </button>
        )}

        {/* Chat toggle (active or completed) */}
        {(isActive || isCompleted) && (
          <button
            onClick={() => {
              setChatOpen((v) => !v);
              if (reviewOpen) setReviewOpen(false);
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ml-auto ${
              chatOpen
                ? "bg-primary/30 text-primary"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Chat
          </button>
        )}

        {/* Review toggle (completed only) */}
        {isCompleted && (
          <button
            onClick={() => {
              setReviewOpen((v) => !v);
              if (chatOpen) setChatOpen(false);
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              reviewOpen
                ? "bg-yellow-500/30 text-yellow-400"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            Review
          </button>
        )}
      </div>

      {/* Expandable panels */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <ChatWindow transactionId={tx.id} currentUserId={userId} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reviewOpen && isCompleted && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <ReviewPanel
              txId={tx.id}
              userId={userId}
              targetId={isBuyer ? tx.seller_id : tx.buyer_id}
              bookId={tx.book_id}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── Review panel with existing reviews + form ───────── */

const ReviewPanel = ({
  txId,
  userId,
  targetId,
  bookId,
}: {
  txId: string;
  userId: string;
  targetId: string;
  bookId: string;
}) => {
  const { reviews, submitReview } = useTransactionReviews(txId);
  const alreadyReviewed = reviews.some((r) => r.reviewer_id === userId);

  return (
    <div className="space-y-3">
      {/* Existing reviews */}
      {reviews.map((r) => (
        <div key={r.id} className="glass-card p-3 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-foreground">
              {r.reviewer?.full_name || "User"}
            </span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-3 h-3 ${
                    s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                  }`}
                />
              ))}
            </div>
          </div>
          {r.comment && (
            <p className="text-xs text-muted-foreground">{r.comment}</p>
          )}
        </div>
      ))}

      {/* Submit form if not yet reviewed */}
      {!alreadyReviewed && (
        <ReviewForm
          onSubmit={(rating, comment) =>
            submitReview({ target_id: targetId, book_id: bookId, rating, comment })
          }
        />
      )}
    </div>
  );
};

/* ── Main page ───────────────────────────────────────── */

const Transactions = () => {
  const { user } = useAuth();
  const {
    transactions,
    loading,
    accept,
    reject,
    cancel,
    complete,
    bookGiven,
    markReceived,
  } = useTransactions("all");
  const [filter, setFilter] = useState<Filter>("All");

  const filtered = useMemo(() => {
    return transactions.filter((t) => matchesFilter(t.status, filter));
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
              <span className="ml-1.5 text-xs opacity-60">
                ({transactions.filter((t) => matchesFilter(t.status, tab)).length})
              </span>
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
            {filtered.map((tx, i) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <TxCard
                  tx={tx}
                  userId={user?.id || ""}
                  accept={accept}
                  reject={reject}
                  cancel={cancel}
                  complete={complete}
                  bookGiven={bookGiven}
                  markReceived={markReceived}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;
