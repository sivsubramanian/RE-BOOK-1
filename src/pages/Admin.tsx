/**
 * Admin Dashboard – Admin-only page for platform management
 * 
 * Features:
 * - View all users, books, transactions
 * - Delete inappropriate listings
 * - Platform-wide statistics
 * 
 * Access: role === "admin" only (enforced by ProtectedRoute)
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users, BookOpen, ArrowLeftRight, Trash2, Loader2, Shield,
  BarChart3, Eye, AlertTriangle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { DbBook, DbUser, DbTransaction } from "@/types";
import { deleteBook } from "@/lib/api/books";
import { toast } from "sonner";
import { resolveImageUrl, getFallbackImage } from "@/lib/url";

interface AdminStats {
  totalUsers: number;
  totalBooks: number;
  totalTransactions: number;
  completedTransactions: number;
  availableBooks: number;
}

const Admin = () => {
  const [tab, setTab] = useState<"overview" | "users" | "books" | "transactions">("overview");
  const [users, setUsers] = useState<DbUser[]>([]);
  const [books, setBooks] = useState<DbBook[]>([]);
  const [transactions, setTransactions] = useState<DbTransaction[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{
        users: DbUser[];
        books: DbBook[];
        transactions: DbTransaction[];
      }>("/admin/data");

      const u = data.users || [];
      const b = data.books || [];
      const t = data.transactions || [];

      setUsers(u);
      setBooks(b);
      setTransactions(t);
      setStats({
        totalUsers: u.length,
        totalBooks: b.length,
        totalTransactions: t.length,
        completedTransactions: t.filter(tx => tx.status === "completed").length,
        availableBooks: b.filter(bk => bk.status === "available").length,
      });
    } catch (err) {
      console.error("Admin data fetch failed:", err);
      toast.error("Failed to load admin data");
    }
    setLoading(false);
  };

  const handleDeleteBook = async (bookId: string) => {
    setDeleting(bookId);
    const { error } = await deleteBook(bookId);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Book deleted");
      setBooks(prev => prev.filter(b => b.id !== bookId));
      if (stats) setStats({ ...stats, totalBooks: stats.totalBooks - 1 });
    }
    setDeleting(null);
  };

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: BarChart3 },
    { key: "users" as const, label: "Users", icon: Users },
    { key: "books" as const, label: "Books", icon: BookOpen },
    { key: "transactions" as const, label: "Transactions", icon: ArrowLeftRight },
  ];

  if (loading) {
    return (
      <div className="min-h-screen pt-14 sm:pt-16 lg:pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-14 sm:pt-16 lg:pt-20 pb-8 sm:pb-12">
      <div className="max-w-6xl mx-auto px-3 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6 sm:mb-8"
        >
          <div className="p-2.5 rounded-xl bg-red-500/10">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
          </div>
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Platform management & moderation</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                tab === key ? "gradient-btn" : "glass-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === "overview" && stats && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-400" },
                { label: "Total Books", value: stats.totalBooks, icon: BookOpen, color: "text-primary" },
                { label: "Available Books", value: stats.availableBooks, icon: Eye, color: "text-green-400" },
                { label: "Transactions", value: stats.totalTransactions, icon: ArrowLeftRight, color: "text-yellow-400" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="glass-card p-3 sm:p-5 rounded-2xl">
                  <Icon className={`w-5 h-5 ${color} mb-2`} />
                  <p className="font-display text-lg sm:text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <div className="glass-card p-4 sm:p-6 rounded-2xl">
              <h3 className="font-display text-sm font-semibold mb-3 text-foreground">Completion Rate</h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all"
                    style={{ width: `${stats.totalTransactions ? Math.round((stats.completedTransactions / stats.totalTransactions) * 100) : 0}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {stats.totalTransactions ? Math.round((stats.completedTransactions / stats.totalTransactions) * 100) : 0}%
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Users */}
        {tab === "users" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <p className="text-xs text-muted-foreground mb-3">{users.length} registered users</p>
            {users.map((u) => (
              <div key={u.id} className="glass-card-hover p-3 sm:p-4 rounded-xl flex flex-wrap sm:flex-nowrap items-center gap-3">
                <img
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.full_name)}`}
                  alt={u.full_name}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-foreground truncate">{u.full_name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <span className="hidden sm:inline text-xs text-muted-foreground">{u.department}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                  u.role === "admin" ? "bg-red-500/20 text-red-400" :
                  u.role === "seller" ? "bg-primary/20 text-primary" :
                  "bg-blue-500/20 text-blue-400"
                }`}>
                  {u.role}
                </span>
              </div>
            ))}
          </motion.div>
        )}

        {/* Books */}
        {tab === "books" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <p className="text-xs text-muted-foreground mb-3">{books.length} total listings</p>
            {books.map((b) => (
              <div key={b.id} className="glass-card-hover p-3 sm:p-4 rounded-xl flex flex-wrap sm:flex-nowrap items-center gap-3">
                <img
                  src={resolveImageUrl(b.image_url)}
                  alt={b.title}
                  onError={(e) => {
                    e.currentTarget.src = getFallbackImage();
                  }}
                  className="w-10 h-14 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-foreground truncate">{b.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {(b.seller as DbUser | undefined)?.full_name || "Unknown"} · ₹{b.price} · {b.department}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize whitespace-nowrap ${
                  b.status === "available" ? "bg-green-500/20 text-green-400" :
                  b.status === "requested" ? "bg-yellow-500/20 text-yellow-400" :
                  "bg-red-500/20 text-red-400"
                }`}>
                  {b.status}
                </span>
                <button
                  onClick={() => handleDeleteBook(b.id)}
                  disabled={deleting === b.id}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  title="Delete listing"
                >
                  {deleting === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </motion.div>
        )}

        {/* Transactions */}
        {tab === "transactions" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <p className="text-xs text-muted-foreground mb-3">{transactions.length} total transactions</p>
            {transactions.map((tx) => (
              <div key={tx.id} className="glass-card-hover p-3 sm:p-4 rounded-xl flex flex-wrap sm:flex-nowrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                    {(tx.book as DbBook | undefined)?.title || "Book"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(tx.buyer as DbUser | undefined)?.full_name || "Buyer"} → {(tx.seller as DbUser | undefined)?.full_name || "Seller"} · {new Date(tx.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize whitespace-nowrap ${
                  tx.status === "completed" ? "bg-green-500/20 text-green-400" :
                  tx.status === "accepted" ? "bg-primary/20 text-primary" :
                  tx.status === "requested" ? "bg-yellow-500/20 text-yellow-400" :
                  tx.status === "rejected" ? "bg-red-500/20 text-red-400" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {tx.status}
                </span>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="glass-card p-8 rounded-2xl text-center">
                <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No transactions found</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Admin;
