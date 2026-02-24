import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, Leaf, BookOpen, ArrowRight, LogOut } from "lucide-react";
import { mockBooks, mockTransactions } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ProfileName: React.FC = () => {
  // useAuth is imported at top of file
  const { displayName } = useAuth();
  const local = typeof window !== "undefined" ? localStorage.getItem("rebook_current_user") : null;
  let fallbackName: string | null = null;
  if (local) {
    try {
      const parsed = JSON.parse(local);
      fallbackName = parsed?.fullName || null;
    } catch (e) {}
  }

  const nameToShow = displayName || fallbackName || "Your Name";

  return (
    <>
      <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">{nameToShow}</h1>
      <p className="text-muted-foreground text-xs sm:text-sm mt-1">Computer Science · Sem 5</p>
    </>
  );
};

const tabs = ["Active Requests", "My Listings", "Completed"];

const Profile = () => {
  const [activeTab, setActiveTab] = useState(0);
  const navigate = useNavigate();
  const { displayName } = useAuth();
  const local = typeof window !== "undefined" ? localStorage.getItem("rebook_current_user") : null;
  let fallbackName: string | null = null;
  if (local) {
    try {
      const parsed = JSON.parse(local);
      fallbackName = parsed?.fullName || null;
    } catch (e) {}
  }
  const nameSeed = displayName || fallbackName || "Student";

  const handleLogout = () => {
    toast.success("Logged out successfully!");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen pt-14 sm:pt-16 lg:pt-20 pb-8 sm:pb-12">
      <div className="max-w-3xl mx-auto px-3 sm:px-6">
        {/* Profile card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl mb-6 sm:mb-8 text-center">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nameSeed)}`}
            alt="avatar"
            className="w-16 sm:w-20 h-16 sm:h-20 rounded-full mx-auto mb-3 sm:mb-4 bg-muted ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
          />
          <ProfileName />

          <div className="flex items-center justify-center gap-3 sm:gap-6 mt-4 sm:mt-5 flex-wrap">
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center text-primary">
                <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-primary" />
                <span className="font-display font-bold text-foreground text-sm sm:text-base">4.8</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Rating</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center text-primary">
                <Leaf className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="font-display font-bold text-foreground text-sm sm:text-base">15</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Books Reused</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center text-primary">
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="font-display font-bold text-foreground text-sm sm:text-base">8</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Listed</p>
            </div>
          </div>

          {/* Logout Button */}
          <Button
            onClick={handleLogout}
            variant="outline"
            className="mt-4 sm:mt-6 w-full sm:w-auto border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-500 text-xs sm:text-sm"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
            Log Out
          </Button>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === i ? "gradient-btn" : "glass-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2.5 sm:space-y-3">
          {activeTab === 0 &&
            mockTransactions
              .filter((t) => t.status === "requested" || t.status === "accepted")
              .map((tx) => (
                <div key={tx.id} className="glass-card-hover p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-foreground truncate">{tx.bookTitle}</p>
                    <p className="text-xs text-muted-foreground">{tx.status === "requested" ? "Awaiting response" : "Accepted"} · {tx.date}</p>
                  </div>
                  <span className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap ${
                    tx.status === "requested" ? "bg-yellow-500/20 text-yellow-400" : "bg-primary/20 text-primary"
                  }`}>
                    {tx.status}
                  </span>
                </div>
              ))}

          {activeTab === 1 &&
            mockBooks.slice(0, 4).map((book) => (
              <div key={book.id} className="glass-card-hover p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center gap-3 sm:gap-4">
                <img src={book.image} alt={book.title} className="w-10 h-14 sm:w-12 sm:h-16 rounded-lg sm:rounded-xl object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-foreground truncate">{book.title}</p>
                  <p className="text-xs text-muted-foreground">₹{book.price} · {book.condition}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
              </div>
            ))}

          {activeTab === 2 &&
            mockTransactions
              .filter((t) => t.status === "completed")
              .map((tx) => (
                <div key={tx.id} className="glass-card-hover p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-foreground truncate">{tx.bookTitle}</p>
                    <p className="text-xs text-muted-foreground">Completed · {tx.date}</p>
                  </div>
                  <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-semibold bg-secondary/20 text-secondary whitespace-nowrap">Done</span>
                </div>
              ))}
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
