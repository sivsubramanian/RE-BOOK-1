/**
 * Seller Studio – Full CRUD for book listings + transaction management
 *
 * Features:
 * - Add Book modal with image upload and validation
 * - Real-time listings from Supabase (mock fallback)
 * - Transaction inbox with accept / reject / complete actions
 * - Stats computed from live data
 */
import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, BookOpen, Inbox, CheckCircle2, Package, X, Upload, Loader2,
  Trash2, Edit3, Check, XCircle, Eye,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useBooks } from "@/hooks/useBooks";
import { useTransactions } from "@/hooks/useTransactions";
import { createBook, deleteBook, updateBookImage, uploadBookImage } from "@/lib/api/books";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { resolveImageUrl, getFallbackImage } from "@/lib/url";

const departments = ["Computer Science", "Electrical Eng.", "Mechanical Eng.", "Business Admin", "Mathematics", "Physics", "Chemistry", "Literature"];
const conditions: Array<"Like New" | "Good" | "Fair"> = ["Like New", "Good", "Fair"];
const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

const statusStyle: Record<string, string> = {
  requested: "bg-yellow-500/20 text-yellow-400",
  accepted: "bg-primary/20 text-primary",
  rejected: "bg-red-500/20 text-red-400",
  completed: "bg-secondary/20 text-secondary",
  cancelled: "bg-muted text-muted-foreground",
};

interface NewBookForm {
  title: string;
  author: string;
  description: string;
  department: string;
  semester: number;
  condition: "Like New" | "Good" | "Fair";
  price: string;
}

const emptyForm: NewBookForm = {
  title: "", author: "", description: "",
  department: departments[0], semester: 3,
  condition: "Good", price: "",
};

const SellerStudio = () => {
  const { user, profile } = useAuth();
  const { books, loading: booksLoading, refetch: refetchBooks } = useBooks(
    user?.id ? { sellerId: user.id, pageSize: 50 } : { pageSize: 0 }
  );
  const { transactions, loading: txLoading, accept, reject, complete } = useTransactions("seller");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewBookForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingImageId, setUpdatingImageId] = useState<string | null>(null);
  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const listingImageRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Compute stats from real data
  const stats = useMemo(() => {
    const totalListed = books.length;
    const requestsReceived = transactions.filter(t => t.status === "requested").length;
    const accepted = transactions.filter(t => t.status === "accepted").length;
    const completed = transactions.filter(t => t.status === "completed").length;
    return [
      { label: "Books Listed", value: totalListed, icon: BookOpen, color: "text-primary" },
      { label: "Requests", value: requestsReceived, icon: Inbox, color: "text-secondary" },
      { label: "Accepted", value: accepted, icon: CheckCircle2, color: "text-emerald-400" },
      { label: "Completed", value: completed, icon: Package, color: "text-primary" },
    ];
  }, [books, transactions]);

  // Pending transactions (need action)
  const pendingTx = useMemo(
    () => transactions.filter(t => ["requested", "accepted"].includes(t.status)),
    [transactions]
  );

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Only JPEG and PNG images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!user?.id) { toast.error("Please login first"); return; }
    if (!form.title.trim() || !form.author.trim()) {
      toast.error("Title and author are required");
      return;
    }
    const price = Number(form.price);
    if (isNaN(price) || price <= 0) {
      toast.error("Enter a valid price");
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl = "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400";

      // Upload image if selected
      if (imageFile) {
        const { url, error: uploadErr } = await uploadBookImage(imageFile, user.id);
        if (uploadErr) {
          toast.error(uploadErr);
          setSubmitting(false);
          return;
        }
        if (url) imageUrl = url;
      }

      const { error } = await createBook({
        title: form.title.trim(),
        author: form.author.trim(),
        description: form.description.trim(),
        department: form.department,
        semester: form.semester,
        condition: form.condition,
        price,
        image_url: imageUrl,
        seller_id: user.id,
      });

      if (error) {
        toast.error(error);
      } else {
        toast.success("Book listed successfully!");
        setForm(emptyForm);
        setImageFile(null);
        setImagePreview(null);
        setShowModal(false);
        refetchBooks();
      }
    } catch (err: unknown) {
      toast.error(err.message || "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (bookId: string) => {
    if (!confirm("Delete this listing?")) return;
    const { error } = await deleteBook(bookId);
    if (error) toast.error(error);
    else { toast.success("Book deleted"); refetchBooks(); }
  };

  const handleListingImageUpdate = async (bookId: string, file: File | null) => {
    if (!file) return;
    setUpdatingImageId(bookId);
    try {
      const { image_url, error } = await updateBookImage(bookId, file);
      if (error) {
        toast.error(error);
        return;
      }
      if (image_url) {
        setImageOverrides((prev) => ({
          ...prev,
          [bookId]: `${resolveImageUrl(image_url)}?v=${Date.now()}`,
        }));
      }
      toast.success("Book image updated");
      refetchBooks();
    } finally {
      const input = listingImageRefs.current[bookId];
      if (input) input.value = "";
      setUpdatingImageId(null);
    }
  };

  return (
    <div className="min-h-screen pt-14 sm:pt-16 lg:pt-20 pb-8 sm:pb-12">
      <div className="max-w-5xl mx-auto px-3 sm:px-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Seller Studio</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">Manage your listings and track exchanges</p>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="gradient-btn px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl flex items-center gap-2 text-xs sm:text-sm font-semibold">
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Add Book</span><span className="sm:hidden">Add</span>
          </motion.button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }} className="glass-card p-3 sm:p-5 rounded-xl sm:rounded-2xl">
              <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color} mb-2 sm:mb-3`} />
              <p className="font-display text-lg sm:text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Transaction inbox */}
        <h2 className="font-display text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-foreground">
          Incoming Requests {pendingTx.length > 0 && <span className="text-primary text-sm">({pendingTx.length})</span>}
        </h2>
        {txLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : pendingTx.length === 0 ? (
          <div className="glass-card p-6 rounded-2xl text-center mb-8">
            <p className="text-muted-foreground text-sm">No pending requests</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3 mb-8 sm:mb-10">
            {pendingTx.map((tx, i) => (
              <motion.div key={tx.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="glass-card-hover p-3 sm:p-4 rounded-xl sm:rounded-2xl flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                    {tx.book?.title || "Book"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    from {tx.buyer?.full_name || "Buyer"} ·{" "}
                    {new Date(tx.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-semibold capitalize ${statusStyle[tx.status]}`}>
                  {tx.status}
                </span>
                <div className="flex gap-1.5 sm:ml-auto">
                  {tx.status === "requested" && (
                    <>
                      <button onClick={() => accept(tx.id)}
                        className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                        title="Accept">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => reject(tx.id)}
                        className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                        title="Reject">
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {tx.status === "accepted" && (
                    <button onClick={() => complete(tx.id)}
                      className="px-3 py-1 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-xs font-medium"
                      title="Mark as completed">
                      Complete
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* My Listings */}
        <h2 className="font-display text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-foreground">My Listings</h2>
        {booksLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : books.length === 0 ? (
          <div className="glass-card p-8 rounded-2xl text-center">
            <p className="text-3xl mb-2">📚</p>
            <p className="text-foreground font-medium mb-1">No listings yet</p>
            <p className="text-muted-foreground text-sm mb-4">Start selling by adding your first book</p>
            <button onClick={() => setShowModal(true)}
              className="gradient-btn px-5 py-2.5 rounded-xl text-sm font-semibold">
              <Plus className="w-4 h-4 inline mr-1" /> Add Book
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {books.map((book, i) => (
              <motion.div key={book.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card-hover rounded-xl sm:rounded-2xl overflow-hidden group relative">
                <Link to={`/book/${book.id}`}>
                  <img
                    src={imageOverrides[book.id] || resolveImageUrl(book.image_url || (book as any).image)}
                    alt={book.title}
                    onError={(e) => {
                      e.currentTarget.src = getFallbackImage();
                    }}
                    className="w-full aspect-[3/4] object-cover"
                    loading="lazy"
                  />
                </Link>
                <div className="p-2.5 sm:p-3">
                  <p className="text-xs sm:text-sm font-medium text-foreground line-clamp-1">{book.title}</p>
                  <div className="flex items-center justify-between mt-0.5 sm:mt-1">
                    <p className="text-xs gradient-text font-bold">₹{book.price}</p>
                    <div className="flex items-center gap-0.5 text-muted-foreground">
                      <Eye className="w-3 h-3" />
                      <span className="text-xs">{book.views_count}</span>
                    </div>
                  </div>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs capitalize ${statusStyle[book.status] || "bg-muted text-muted-foreground"}`}>
                    {book.status}
                  </span>
                </div>
                {/* Delete overlay */}
                <button onClick={() => handleDelete(book.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <input
                  ref={(el) => { listingImageRefs.current[book.id] = el; }}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    void handleListingImageUpdate(book.id, e.target.files?.[0] || null);
                  }}
                />
                <button
                  onClick={() => listingImageRefs.current[book.id]?.click()}
                  disabled={updatingImageId === book.id}
                  className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-background/85 text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background disabled:opacity-100 disabled:cursor-not-allowed"
                >
                  {updatingImageId === book.id ? "Updating..." : "Edit Image"}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ─── ADD BOOK MODAL ─── */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !submitting && setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-lg font-bold text-foreground">Add New Book</h2>
                <button onClick={() => !submitting && setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Image upload */}
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Cover Image</label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-border/50 rounded-xl p-4 cursor-pointer hover:border-primary/50 transition-colors text-center">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-24 h-32 object-cover rounded-lg mx-auto" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Click to upload (JPEG, PNG · max 5MB)</p>
                      </>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png"
                    onChange={handleImageSelect} className="hidden" />
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Title *</label>
                  <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Data Structures and Algorithms"
                    className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground outline-none focus:border-primary/50" />
                </div>

                {/* Author */}
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Author *</label>
                  <input value={form.author} onChange={(e) => setForm(f => ({ ...f, author: e.target.value }))}
                    placeholder="e.g. Robert Sedgewick"
                    className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground outline-none focus:border-primary/50" />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3} placeholder="Brief description of the book..."
                    className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground outline-none focus:border-primary/50 resize-none" />
                </div>

                {/* Department + Semester row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Department</label>
                    <select value={form.department} onChange={(e) => setForm(f => ({ ...f, department: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground outline-none focus:border-primary/50">
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Semester</label>
                    <select value={form.semester} onChange={(e) => setForm(f => ({ ...f, semester: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground outline-none focus:border-primary/50">
                      {semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Condition + Price row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Condition</label>
                    <select value={form.condition} onChange={(e) => setForm(f => ({ ...f, condition: e.target.value as DbBook["condition"] }))}
                      className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground outline-none focus:border-primary/50">
                      {conditions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Price (₹) *</label>
                    <input type="number" min="1" value={form.price}
                      onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
                      placeholder="e.g. 250"
                      className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground outline-none focus:border-primary/50" />
                  </div>
                </div>

                {/* Submit */}
                <button onClick={handleSubmit} disabled={submitting}
                  className="w-full gradient-btn py-3 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Listing...</> : <><Plus className="w-4 h-4" /> List Book</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SellerStudio;
