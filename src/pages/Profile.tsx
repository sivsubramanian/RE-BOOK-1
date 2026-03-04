/**
 * Profile Page – Real Supabase auth + transaction history + profile editing
 */
import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Star, Leaf, BookOpen, ArrowRight, LogOut, Edit3, Save, X, Loader2, Heart,
} from "lucide-react";
import { useBooks } from "@/hooks/useBooks";
import { useTransactions } from "@/hooks/useTransactions";
import { useFavorites } from "@/hooks/useFavorites";
import { useUserReviews } from "@/hooks/useReviews";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const tabs = ["Active Requests", "My Listings", "Favorites", "Completed"];

const statusBadge: Record<string, string> = {
  requested: "bg-yellow-500/20 text-yellow-400",
  accepted: "bg-primary/20 text-primary",
  rejected: "bg-red-500/20 text-red-400",
  completed: "bg-secondary/20 text-secondary",
  cancelled: "bg-muted text-muted-foreground",
};

const Profile = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const { user, profile, signOut, updateProfile, displayName, loggingOut } = useAuth();
  const queryClient = useQueryClient();
  const { transactions, loading: txLoading } = useTransactions("all");
  const { books, loading: booksLoading } = useBooks(
    user?.id ? { sellerId: user.id, pageSize: 50 } : { pageSize: 0 }
  );
  const { favorites, loading: favsLoading } = useFavorites();
  const { stats: ratingStats, reviews: userReviews, loading: reviewsLoading } = useUserReviews(user?.id);

  const nameToShow = displayName || profile?.full_name || "Your Name";
  const avatarSeed = nameToShow;

  // Computed stats
  const stats = useMemo(() => {
    const completedCount = transactions.filter((t) => t.status === "completed").length;
    return {
      rating: ratingStats.review_count > 0 ? ratingStats.average_rating.toFixed(1) : "–",
      reviewCount: ratingStats.review_count,
      reused: completedCount,
      listed: books.length,
    };
  }, [transactions, books, ratingStats]);

  // Tab content
  const activeRequests = useMemo(
    () => transactions.filter((t) => ["requested", "accepted"].includes(t.status)),
    [transactions]
  );
  const completedTx = useMemo(
    () => transactions.filter((t) => t.status === "completed"),
    [transactions]
  );

  const handleLogout = async () => {
    await signOut();
    queryClient.clear();
    toast.success("Logged out successfully!");
    navigate("/auth", { replace: true });
  };

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    const { error } = await updateProfile({ full_name: editName.trim() });
    setSaving(false);
    if (error) toast.error(error);
    else {
      toast.success("Profile updated!");
      setEditing(false);
    }
  };

  return (
    <div className="min-h-screen pt-14 sm:pt-16 lg:pt-20 pb-8 sm:pb-12">
      <div className="max-w-3xl mx-auto px-3 sm:px-6">
        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl mb-6 sm:mb-8 text-center"
        >
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}`}
            alt="avatar"
            className="w-16 sm:w-20 h-16 sm:h-20 rounded-full mx-auto mb-3 sm:mb-4 bg-muted ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
          />

          {editing ? (
            <div className="flex items-center justify-center gap-2 mb-1">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-foreground text-sm outline-none focus:border-primary/50 w-48 text-center"
                autoFocus
              />
              <button
                onClick={handleSaveName}
                disabled={saving}
                className="p-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 mb-1">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                {nameToShow}
              </h1>
              <button
                onClick={() => { setEditName(nameToShow); setEditing(true); }}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            {profile?.department || "–"} · Sem {profile?.semester || "–"}
          </p>
          <p className="text-muted-foreground text-xs mt-0.5">
            {user?.email || ""}
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-3 sm:gap-6 mt-4 sm:mt-5 flex-wrap">
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center text-primary">
                <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-primary" />
                <span className="font-display font-bold text-foreground text-sm sm:text-base">
                  {stats.rating}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Rating ({stats.reviewCount})</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center text-primary">
                <Leaf className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="font-display font-bold text-foreground text-sm sm:text-base">
                  {stats.reused}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Books Reused</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center text-primary">
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="font-display font-bold text-foreground text-sm sm:text-base">
                  {stats.listed}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Listed</p>
            </div>
          </div>

          {/* Logout Button */}
          <Button
            onClick={handleLogout}
            disabled={loggingOut}
            variant="outline"
            className="mt-4 sm:mt-6 w-full sm:w-auto border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-500 text-xs sm:text-sm disabled:opacity-50"
          >
            {loggingOut ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 animate-spin" /> : <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />}
            {loggingOut ? "Logging out…" : "Log Out"}
          </Button>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === i
                  ? "gradient-btn"
                  : "glass-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Loading */}
        {(txLoading || booksLoading || favsLoading || reviewsLoading) && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {/* Tab content */}
        {!txLoading && !booksLoading && !favsLoading && !reviewsLoading && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2.5 sm:space-y-3"
          >
            {/* Active Requests */}
            {activeTab === 0 && (
              <>
                {activeRequests.length === 0 && (
                  <div className="glass-card p-6 rounded-2xl text-center">
                    <p className="text-muted-foreground text-sm">No active requests</p>
                  </div>
                )}
                {activeRequests.map((tx) => (
                  <div
                    key={tx.id}
                    className="glass-card-hover p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center gap-3 sm:gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                        {tx.book?.title || "Book"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.buyer_id === user?.id ? "You requested" : `From ${tx.buyer?.full_name || "Buyer"}`}
                        {" · "}
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap ${
                        statusBadge[tx.status] || ""
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>
                ))}
              </>
            )}

            {/* My Listings */}
            {activeTab === 1 && (
              <>
                {books.length === 0 && (
                  <div className="glass-card p-6 rounded-2xl text-center">
                    <p className="text-muted-foreground text-sm">No listings yet</p>
                  </div>
                )}
                {books.map((book) => (
                  <div
                    key={book.id}
                    onClick={() => navigate(`/book/${book.id}`)}
                    className="glass-card-hover p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center gap-3 sm:gap-4 cursor-pointer"
                  >
                    <img
                      src={book.image_url || (book as any).image}
                      alt={book.title}
                      className="w-10 h-14 sm:w-12 sm:h-16 rounded-lg sm:rounded-xl object-cover flex-shrink-0"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                        {book.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ₹{book.price} · {book.condition}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
              </>
            )}

            {/* Favorites */}
            {activeTab === 2 && (
              <>
                {favorites.length === 0 && (
                  <div className="glass-card p-6 rounded-2xl text-center">
                    <Heart className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No favorites yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Tap the heart on any book to save it here</p>
                  </div>
                )}
                {favorites.map((fav) => (
                  <div
                    key={fav.id}
                    onClick={() => navigate(`/book/${fav.book_id}`)}
                    className="glass-card-hover p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center gap-3 sm:gap-4 cursor-pointer"
                  >
                    <img
                      src={fav.book?.image_url || `https://picsum.photos/seed/${fav.book_id}/400/560`}
                      alt={fav.book?.title || "Book"}
                      className="w-10 h-14 sm:w-12 sm:h-16 rounded-lg sm:rounded-xl object-cover flex-shrink-0"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                        {fav.book?.title || "Book"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ₹{fav.book?.price} · {fav.book?.condition}
                      </p>
                    </div>
                    <Heart className="w-4 h-4 fill-red-500 text-red-500 flex-shrink-0" />
                  </div>
                ))}
              </>
            )}

            {/* Completed */}
            {activeTab === 3 && (
              <>
                {completedTx.length === 0 && (
                  <div className="glass-card p-6 rounded-2xl text-center">
                    <p className="text-muted-foreground text-sm">No completed transactions</p>
                  </div>
                )}
                {completedTx.map((tx) => (
                  <div
                    key={tx.id}
                    className="glass-card-hover p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center gap-3 sm:gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                        {tx.book?.title || "Book"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Completed · {new Date(tx.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-semibold bg-secondary/20 text-secondary whitespace-nowrap">
                      Done
                    </span>
                  </div>
                ))}
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Profile;
