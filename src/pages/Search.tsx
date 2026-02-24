import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
import BookCard from "@/components/BookCard";
import { mockBooks } from "@/lib/mockData";

const departments = ["All", "Computer Science", "Electrical Eng.", "Mechanical Eng.", "Business Admin", "Mathematics", "Physics"];
const conditions = ["All", "Like New", "Good", "Fair"];

const Search = () => {
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("All");
  const [cond, setCond] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  const results = useMemo(() => {
    return mockBooks.filter((b) => {
      const matchesQuery = !query || b.title.toLowerCase().includes(query.toLowerCase()) || b.author.toLowerCase().includes(query.toLowerCase());
      const matchesDept = dept === "All" || b.department === dept;
      const matchesCond = cond === "All" || b.condition === cond;
      return matchesQuery && matchesDept && matchesCond;
    });
  }, [query, dept, cond]);

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
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search titles, authors..."
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-xs sm:text-sm"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              className={`glass-card px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl transition-colors ${
                showFilters ? "text-primary border-primary/30" : "text-muted-foreground"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>
          </div>

          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-3 sm:mt-4 glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl space-y-3 sm:space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Department</p>
                <div className="flex flex-wrap gap-2">
                  {departments.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDept(d)}
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all ${
                        dept === d ? "gradient-btn" : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Condition</p>
                <div className="flex flex-wrap gap-2">
                  {conditions.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCond(c)}
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all ${
                        cond === c ? "gradient-btn" : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">{results.length} books found</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {results.map((book, i) => (
            <BookCard key={book.id} book={book} index={i} />
          ))}
        </div>

        {results.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📚</p>
            <p className="text-muted-foreground">No books found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
