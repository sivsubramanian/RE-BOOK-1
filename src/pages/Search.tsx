/**
 * Search Page – Full-featured book search with filters and pagination
 */
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Search as SearchIcon, SlidersHorizontal, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import BookCard from "@/components/BookCard";
import { useBooks } from "@/hooks/useBooks";

const departments = ["All", "Computer Science", "Electrical Eng.", "Mechanical Eng.", "Business Admin", "Mathematics", "Physics", "Chemistry", "Literature"];
const conditions = ["All", "Like New", "Good", "Fair"];
const semesters = ["All", "1", "2", "3", "4", "5", "6", "7", "8"];

const Search = () => {
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("All");
  const [cond, setCond] = useState("All");
  const [sem, setSem] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const { books, total, totalPages, loading } = useBooks({
    query: query || undefined,
    department: dept !== "All" ? dept : undefined,
    condition: cond !== "All" ? cond : undefined,
    semester: sem !== "All" ? Number(sem) : undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    page,
    pageSize: 12,
  });

  const clearFilters = useCallback(() => {
    setDept("All");
    setCond("All");
    setSem("All");
    setMinPrice("");
    setMaxPrice("");
    setPage(1);
  }, []);

  const hasActiveFilters = dept !== "All" || cond !== "All" || sem !== "All" || minPrice || maxPrice;

  return (
    <div className="min-h-screen pt-14 sm:pt-16 lg:pt-20 pb-8 sm:pb-12">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-foreground">Find Your Books</h1>

          <div className="flex gap-2 sm:gap-3">
            <div className="flex-1 glass-card flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl">
              <SearchIcon className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                placeholder="Search titles, authors, subjects..."
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-xs sm:text-sm"
              />
              {query && (
                <button onClick={() => { setQuery(""); setPage(1); }} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              className={`glass-card px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl transition-colors relative ${
                showFilters ? "text-primary border-primary/30" : "text-muted-foreground"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full" />
              )}
            </motion.button>
          </div>

          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-3 sm:mt-4 glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl space-y-3 sm:space-y-4">
              {/* Department */}
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Department</p>
                <div className="flex flex-wrap gap-2">
                  {departments.map((d) => (
                    <button
                      key={d}
                      onClick={() => { setDept(d); setPage(1); }}
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all ${
                        dept === d ? "gradient-btn" : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Semester */}
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Semester</p>
                <div className="flex flex-wrap gap-2">
                  {semesters.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setSem(s); setPage(1); }}
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all ${
                        sem === s ? "gradient-btn" : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s === "All" ? "All" : `Sem ${s}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Condition */}
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Condition</p>
                <div className="flex flex-wrap gap-2">
                  {conditions.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setCond(c); setPage(1); }}
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all ${
                        cond === c ? "gradient-btn" : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Price Range (₹)</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
                    className="w-24 px-3 py-1.5 rounded-lg text-xs bg-muted/50 border border-border/50 text-foreground outline-none focus:border-primary/50"
                  />
                  <span className="text-muted-foreground text-xs">to</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
                    className="w-24 px-3 py-1.5 rounded-lg text-xs bg-muted/50 border border-border/50 text-foreground outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-primary hover:text-secondary transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Results count */}
        <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
          {loading ? "Searching..." : `${total} book${total !== 1 ? 's' : ''} found`}
          {totalPages > 1 && ` · Page ${page} of ${totalPages}`}
        </p>

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Book grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {books.map((book, i) => (
                <BookCard key={book.id} book={book} index={i} />
              ))}
            </div>

            {/* Empty state */}
            {books.length === 0 && !loading && (
              <div className="text-center py-20 glass-card rounded-2xl">
                <p className="text-4xl mb-3">📚</p>
                <p className="text-foreground font-medium mb-1">No books found</p>
                <p className="text-muted-foreground text-sm">Try adjusting your filters or search terms.</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="glass-card p-2 rounded-xl disabled:opacity-30 hover:bg-muted/50 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = page <= 3 ? i + 1 : page + i - 2;
                  if (pageNum > totalPages || pageNum < 1) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${
                        pageNum === page ? "gradient-btn" : "glass-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="glass-card p-2 rounded-xl disabled:opacity-30 hover:bg-muted/50 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Search;
