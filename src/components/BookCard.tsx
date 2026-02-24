import { motion } from "framer-motion";
import { Star, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Book } from "@/lib/mockData";

const conditionColors: Record<string, string> = {
  "Like New": "bg-primary/20 text-primary",
  Good: "bg-secondary/20 text-secondary",
  Fair: "bg-yellow-500/20 text-yellow-400",
};

const BookCard = ({ book, index = 0 }: { book: Book; index?: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="group glass-card-hover overflow-hidden flex flex-col"
    >
      <Link to={`/book/${book.id}`} className="flex flex-col h-full">
        <div className="relative aspect-[3/4] overflow-hidden rounded-t-2xl">
          <img
            src={book.image}
            alt={book.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
          <div className="absolute top-3 left-3 flex gap-1.5">
            <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-primary/20 text-primary backdrop-blur-sm">
              Sem {book.semester}
            </span>
            <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full backdrop-blur-sm ${conditionColors[book.condition]}`}>
              {book.condition}
            </span>
          </div>
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="gradient-btn p-2.5 rounded-full">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="p-4 flex flex-col flex-1">
          <p className="text-xs text-muted-foreground mb-1">{book.department}</p>
          <h3 className="font-display font-semibold text-sm leading-tight mb-2 line-clamp-2 text-foreground">
            {book.title}
          </h3>
          <p className="text-xs text-muted-foreground mb-3">{book.author}</p>

          <div className="mt-auto flex items-center justify-between">
            <span className="font-display font-bold text-lg gradient-text">₹{book.price}</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="w-3 h-3 fill-primary text-primary" />
              <span>{book.sellerRating}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default BookCard;
