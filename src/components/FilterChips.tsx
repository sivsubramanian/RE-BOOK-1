import { useState } from "react";
import { motion } from "framer-motion";

const semesters = ["All", "Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6", "Sem 7", "Sem 8"];

const FilterChips = ({ onSelect }: { onSelect?: (filter: string) => void }) => {
  const [active, setActive] = useState("All");

  return (
    <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {semesters.map((sem) => (
        <motion.button
          key={sem}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setActive(sem);
            onSelect?.(sem);
          }}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 ${
            active === sem
              ? "gradient-btn"
              : "glass-card text-muted-foreground hover:text-foreground hover:bg-muted/80"
          }`}
        >
          {sem}
        </motion.button>
      ))}
    </div>
  );
};

export default FilterChips;
