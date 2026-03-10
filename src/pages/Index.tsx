/**
 * Home Page – Dashboard with AI-powered recommendations
 * Uses Supabase data with fallback to mock data
 */
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Clock, IndianRupee, Loader2, BookOpen } from "lucide-react";
import BookCard from "@/components/BookCard";
import FilterChips from "@/components/FilterChips";
import { useAuth } from "@/context/AuthContext";
import { useAllBooks } from "@/hooks/useBooks";
import { getPersonalizedRecommendations, getColdStartRecommendations } from "@/lib/ai/recommendation";
import type { DbUser } from "@/types";

const Index = () => {
  const { profile, displayName } = useAuth();
  const { books, loading } = useAllBooks();
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);

  const filteredBooks = useMemo(() => {
    if (!selectedSemester) return books;
    return books.filter((book) => Number(book.semester) === selectedSemester);
  }, [books, selectedSemester]);

  // AI-powered sections
  const sections = useMemo(() => {
    if (!books.length) return [];

    if (!filteredBooks.length) return [];

    // "Recommended for You" using AI engine
    const recommended = profile
      ? getPersonalizedRecommendations(filteredBooks, profile as DbUser, 4)
      : getColdStartRecommendations(filteredBooks, 4);

    // Recently listed
    const recent = [...filteredBooks]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 4);

    // Budget-friendly (cheapest available)
    const budget = [...filteredBooks]
      .filter(b => b.status === "available")
      .sort((a, b) => a.price - b.price)
      .slice(0, 4);

    // Trending (most views)
    const trending = [...filteredBooks]
      .sort((a, b) => b.views_count - a.views_count)
      .slice(0, 4);

    return [
      {
        title: "Recommended for You",
        icon: Sparkles,
        books: recommended.map(r => r.book),
        isAI: true,
      },
      { title: "Trending on Campus", icon: TrendingUp, books: trending },
      { title: "Recently Listed", icon: Clock, books: recent },
      { title: "Budget-Friendly Picks", icon: IndianRupee, books: budget },
    ];
  }, [books, profile, filteredBooks]);

  if (loading) {
    return (
      <div className="min-h-screen pt-14 sm:pt-16 lg:pt-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading books...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-14 sm:pt-16 lg:pt-20 pb-8 sm:pb-12">
      {/* Hero */}
      <section className="relative overflow-hidden mb-12">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background/80 to-background" />
        </div>
        <div className="relative max-w-7xl mx-auto px-3 sm:px-6 py-8 sm:py-12 lg:py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-muted-foreground mb-2">Welcome back,</p>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold mb-3 text-foreground">
              Hey, <span className="gradient-text">{displayName || "Student"}</span> 👋
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base lg:text-lg max-w-md mb-8">
              Discover affordable textbooks from your peers. Reuse. Resell. Relearn.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2 glass-card rounded-full text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">AI-powered recommendations just for you</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 glass-card rounded-full text-sm">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">{books.length} books available</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 mb-6 sm:mb-8">
        <FilterChips
          activeFilter={activeFilter}
          onSelect={(filter) => {
            setActiveFilter(filter);
            if (filter === "All") {
              setSelectedSemester(null);
              return;
            }

            const match = filter.match(/\d+/);
            const parsed = match ? Number(match[0]) : Number.NaN;
            setSelectedSemester(Number.isNaN(parsed) ? null : parsed);
          }}
        />
        <div className="mt-3 text-xs sm:text-sm text-muted-foreground">
          Showing: <span className="text-foreground font-medium">{activeFilter}</span>
          <span className="mx-2">•</span>
          <span>{filteredBooks.length} book{filteredBooks.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Sections */}
      {selectedSemester && sections.length === 0 && (
        <section className="max-w-7xl mx-auto px-3 sm:px-6 mb-8 sm:mb-12">
          <div className="text-center py-10 glass-card rounded-2xl">
            <p className="text-muted-foreground text-sm">
              No books available for Sem {selectedSemester} right now.
            </p>
          </div>
        </section>
      )}

      {sections.map((section, sIdx) => (
        <section key={section.title} className="max-w-7xl mx-auto px-3 sm:px-6 mb-8 sm:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sIdx * 0.1 + 0.2 }}
            className="flex items-center gap-2 mb-5"
          >
            <section.icon className={`w-5 h-5 ${section.isAI ? "text-secondary" : "text-primary"}`} />
            <h2 className="font-display text-xl font-semibold text-foreground">{section.title}</h2>
            {section.isAI && (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-secondary/20 text-secondary">
                AI
              </span>
            )}
          </motion.div>
          {section.books.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {section.books.map((book, i) => (
                <BookCard key={book.id} book={book} index={i} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 glass-card rounded-2xl">
              <p className="text-muted-foreground text-sm">No books in this category yet.</p>
            </div>
          )}
        </section>
      ))}
    </div>
  );
};

export default Index;
