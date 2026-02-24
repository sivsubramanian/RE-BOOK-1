import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Clock, IndianRupee } from "lucide-react";
import BookCard from "@/components/BookCard";
import FilterChips from "@/components/FilterChips";
import { mockBooks } from "@/lib/mockData";
import heroImage from "@/assets/hero-books.jpg";

const sections = [
  { title: "Trending in Your Department", icon: TrendingUp, books: mockBooks.slice(0, 4) },
  { title: "Recently Listed", icon: Clock, books: mockBooks.slice(4, 8) },
  { title: "Budget-Friendly Picks", icon: IndianRupee, books: mockBooks.slice(8, 12) },
];

const Index = () => {
  return (
    <div className="min-h-screen pt-14 sm:pt-16 lg:pt-20 pb-8 sm:pb-12">
      {/* Hero */}
      <section className="relative overflow-hidden mb-12">
        <div className="absolute inset-0">
          <img src={heroImage} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        </div>
        <div className="relative max-w-7xl mx-auto px-3 sm:px-6 py-8 sm:py-12 lg:py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-muted-foreground mb-2">Welcome back,</p>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold mb-3 text-foreground">
              Hey, <span className="gradient-text">Student</span> 👋
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base lg:text-lg max-w-md mb-8">
              Discover affordable textbooks from your peers. Reuse. Resell. Relearn.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 glass-card rounded-full text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">AI-powered recommendations just for you</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 mb-6 sm:mb-8">
        <FilterChips />
      </div>

      {/* Sections */}
      {sections.map((section, sIdx) => (
        <section key={section.title} className="max-w-7xl mx-auto px-3 sm:px-6 mb-8 sm:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sIdx * 0.1 + 0.2 }}
            className="flex items-center gap-2 mb-5"
          >
            <section.icon className="w-5 h-5 text-primary" />
            <h2 className="font-display text-xl font-semibold text-foreground">{section.title}</h2>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {section.books.map((book, i) => (
              <BookCard key={book.id} book={book} index={i} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default Index;
