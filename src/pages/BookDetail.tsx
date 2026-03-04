/**
 * BookDetail – Full book view with real transaction flow
 * Uses Supabase data with mock fallback
 */
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ArrowLeft, Heart, Share2, ShieldCheck, Loader2, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAllBooks } from "@/hooks/useBooks";
import { useTransactions } from "@/hooks/useTransactions";
import { useFavoriteIds } from "@/hooks/useFavorites";
import { fetchBookById, incrementViews } from "@/lib/api/books";
import { getRecommendations } from "@/lib/ai/recommendation";
import BookCard from "@/components/BookCard";
import type { DbBook, DbUser } from "@/types";
import { toast } from "sonner";

const BookDetail = () => {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const { books: allBooks } = useAllBooks();
  const { requestBook } = useTransactions();
  const { favoriteIds, toggle: toggleFav } = useFavoriteIds();
  const [book, setBook] = useState<DbBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [requested, setRequested] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [similar, setSimilar] = useState<DbBook[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (async () => {
      try {
        const b = await fetchBookById(id);
        if (b) {
          setBook(b);
          incrementViews(id); // fire-and-forget
        } else {
          // Fallback to allBooks
          const fallback = allBooks.find(bk => bk.id === id);
          if (fallback) setBook(fallback);
        }
      } catch {
        const fallback = allBooks.find(bk => bk.id === id);
        if (fallback) setBook(fallback);
      }
      setLoading(false);
    })();
  }, [id, allBooks]);

  // Compute similar books using AI recommendation
  useEffect(() => {
    if (!book || !allBooks.length) return;
    const recs = getRecommendations(
      `${book.title} ${book.department} semester ${book.semester}`,
      allBooks.filter(b => b.id !== book.id),
      profile as DbUser | null,
      4
    );
    setSimilar(recs.map(r => r.book));
  }, [book, allBooks, profile]);

  const handleRequest = async () => {
    if (!book || !user) {
      toast.error("Please login to request a book");
      return;
    }
    if (user.id === book.seller_id) {
      toast.error("You can't request your own book");
      return;
    }
    setShowModal(true);
    const success = await requestBook(book.id, book.seller_id);
    setTimeout(() => {
      setShowModal(false);
      if (success) setRequested(true);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-14 sm:pt-16 lg:pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen pt-14 sm:pt-16 lg:pt-20 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Book not found</p>
          <Link to="/home" className="text-primary text-sm mt-2 inline-block hover:underline">Go home</Link>
        </div>
      </div>
    );
  }

  const imageUrl = book.image_url || `https://picsum.photos/seed/${book.id}/400/560`;
  const sellerName = book.seller?.full_name || "Seller";
  const sellerAvatar = book.seller?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sellerName}`;
  const isOwner = user?.id === book.seller_id;
  const isUnavailable = book.status !== "available";

  return (
    <div className="min-h-screen pt-14 sm:pt-16 lg:pt-20 pb-8 sm:pb-12">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={imageUrl} alt="" className="w-full h-full object-cover blur-3xl opacity-20 scale-110" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 to-background" />
        </div>

        <div className="relative max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-12">
          <Link to="/home" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-xs sm:text-sm mb-6 sm:mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to feed
          </Link>

          <div className="grid md:grid-cols-[300px_1fr] gap-4 sm:gap-8">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-3xl overflow-hidden glow-md">
              <img src={imageUrl} alt={book.title} className="w-full aspect-[3/4] object-cover" />
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="flex flex-col">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs text-primary font-semibold">{book.department} · Sem {book.semester}</span>
                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full capitalize ${
                  book.status === 'available' ? 'bg-green-500/20 text-green-400' :
                  book.status === 'requested' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {book.status}
                </span>
              </div>
              <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold mb-2 text-foreground">{book.title}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">by {book.author}</p>
              {book.description && (
                <p className="text-xs text-muted-foreground mb-4 line-clamp-3">{book.description}</p>
              )}

              <div className="glass-card p-3 sm:p-5 mb-4 sm:mb-6 space-y-3 rounded-2xl">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Condition</span>
                  <span className="text-foreground font-medium">{book.condition}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-display font-bold text-lg sm:text-xl gradient-text">₹{book.price}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Views</span>
                  <span className="text-foreground">{book.views_count}</span>
                </div>
              </div>

              {/* Seller card */}
              <div className="glass-card p-3 sm:p-4 flex items-center gap-3 mb-4 sm:mb-6 rounded-2xl">
                <img src={sellerAvatar} alt={sellerName} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-muted" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-foreground truncate">{sellerName}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="w-3 h-3 fill-primary text-primary flex-shrink-0" /> 4.8
                    <ShieldCheck className="w-3 h-3 text-primary ml-1 flex-shrink-0" /> <span className="hidden sm:inline">Verified</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3 mt-auto">
                {!isOwner && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleRequest}
                    disabled={requested || isUnavailable}
                    className={`flex-1 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-semibold text-xs sm:text-sm transition-all duration-300 ${
                      requested ? "bg-primary/20 text-primary" :
                      isUnavailable ? "bg-muted text-muted-foreground cursor-not-allowed" :
                      "gradient-btn"
                    }`}
                  >
                    {requested ? "✓ Request Sent" : isUnavailable ? `Book ${book.status}` : "Request Book"}
                  </motion.button>
                )}
                {isOwner && (
                  <div className="flex-1 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-semibold text-xs sm:text-sm text-center bg-muted/50 text-muted-foreground">
                    Your Listing
                  </div>
                )}
                <button
                  onClick={() => book && toggleFav(book.id)}
                  className="glass-card p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl transition-colors"
                >
                  <Heart className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${book && favoriteIds.has(book.id) ? "fill-red-500 text-red-500" : "text-muted-foreground hover:text-foreground"}`} />
                </button>
                <button className="glass-card p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl text-muted-foreground hover:text-foreground transition-colors">
                  <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* AI-powered Similar Books */}
      {similar.length > 0 && (
        <section className="max-w-5xl mx-auto px-3 sm:px-6 mt-12">
          <div className="flex items-center gap-2 mb-5">
            <h2 className="font-display text-xl font-semibold text-foreground">Similar Books</h2>
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-secondary/20 text-secondary">AI</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {similar.map((b, i) => (
              <BookCard key={b.id} book={b} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Request modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-8 text-center max-w-sm mx-4 rounded-2xl"
            >
              <div className="w-16 h-16 mx-auto rounded-full gradient-btn flex items-center justify-center mb-4 animate-glow-pulse">
                <span className="text-2xl">📚</span>
              </div>
              <h3 className="font-display text-lg font-bold mb-2 text-foreground">Sending Request...</h3>
              <p className="text-sm text-muted-foreground">Notifying {sellerName} about your interest.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookDetail;
