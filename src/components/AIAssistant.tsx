/**
 * AI Assistant – Floating chatbot with real TF-IDF + Cosine Similarity recommendations
 *
 * Features:
 * - Intent detection (search, budget, semester, recommendation, greeting, help)
 * - TF-IDF powered book search over live Supabase data
 * - Quick-action chips for common queries
 * - OCR integration for text extraction from images
 * - Typing indicator
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Sparkles, Camera, Loader2, BookOpen } from "lucide-react";
import ImageOCR from "./ImageOCR";
import { useAllBooks } from "@/hooks/useBooks";
import { useAuth } from "@/context/AuthContext";
import {
  getRecommendations,
  getColdStartRecommendations,
  generateResponse,
  detectIntent,
} from "@/lib/ai/recommendation";
import { fetchChatbotSuggestions } from "@/lib/api/chatbot";
import { useNavigate } from "react-router-dom";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  books?: Array<{ id: string; title: string; price: number }>;
}

const QUICK_ACTIONS = [
  "Recommend books for me",
  "Cheap books under ₹200",
  "CSE semester 5 books",
  "Trending on campus",
];

const AIAssistant = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hey! 👋 I'm your ReBook AI assistant powered by TF-IDF & Cosine Similarity. I can find books, recommend reads for your semester, or search by budget. Try the quick actions below or ask me anything!",
    },
  ]);
  const [input, setInput] = useState("");
  const [showOCR, setShowOCR] = useState(false);
  const [thinking, setThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { books: allBooks, loading: booksLoading } = useAllBooks();
  const { profile } = useAuth();

  // Auto-scroll on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const processQuery = useCallback(
    (query: string) => {
      setThinking(true);

      // Simulate a tiny delay for UX (feels more "AI-like")
      setTimeout(async () => {
        const { intent, entities } = detectIntent(query);

        let results;
        try {
          const bot = await fetchChatbotSuggestions(query);
          results = (bot.books || []).map((book) => ({ book, score: Number(book.score || 0) }));
        } catch {
          if (intent === "recommendation" && profile) {
            // Use personalized recommendations
            results = getRecommendations(query, allBooks, profile, 6);
          } else if (allBooks.length > 0) {
            results = getRecommendations(query, allBooks, profile, 6);
          } else {
            results = [];
          }
        }

        // Handle cold-start: if no results and intent isn't greeting/help
        if (results.length === 0 && !["greeting", "help"].includes(intent)) {
          results = getColdStartRecommendations(allBooks, 4);
        }

        const response = generateResponse(query, intent, results, entities);

        const bookLinks =
          results.length > 0
            ? results.slice(0, 4).map((r) => ({
                id: r.book.id,
                title: r.book.title,
                price: r.book.price,
              }))
            : undefined;

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: response, books: bookLinks },
        ]);
        setThinking(false);
      }, 400 + Math.random() * 400);
    },
    [allBooks, profile]
  );

  const send = (overrideMsg?: string) => {
    const msg = overrideMsg || input.trim();
    if (!msg) return;
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    if (!overrideMsg) setInput("");
    processQuery(msg);
  };

  return (
    <>
      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 w-12 sm:w-14 h-12 sm:h-14 rounded-full gradient-btn flex items-center justify-center animate-glow-pulse"
      >
        {open ? (
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        ) : (
          <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-80 lg:w-96 h-[calc(100vh-160px)] sm:h-[520px] glass-card flex flex-col overflow-hidden rounded-2xl"
          >
            {/* Header */}
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border/50 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              <span className="font-display font-semibold text-xs sm:text-sm text-foreground">
                ReBook AI
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {booksLoading ? "Loading..." : `${allBooks.length} books indexed`}
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`max-w-[88%] ${
                    msg.role === "user" ? "ml-auto" : ""
                  }`}
                >
                  <div
                    className={`px-3 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm whitespace-pre-line ${
                      msg.role === "user"
                        ? "bg-primary/20 text-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                  {/* Book links */}
                  {msg.books && msg.books.length > 0 && (
                    <div className="mt-1.5 space-y-1">
                      {msg.books.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => { navigate(`/book/${b.id}`); setOpen(false); }}
                          className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                        >
                          <BookOpen className="w-3 h-3 text-primary flex-shrink-0" />
                          <span className="text-xs text-foreground truncate flex-1">{b.title}</span>
                          <span className="text-xs gradient-text font-bold">₹{b.price}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Typing indicator */}
              {thinking && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center gap-1.5 text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-xs">Analyzing with TF-IDF...</span>
                </motion.div>
              )}

              {/* Quick actions (shown after first message) */}
              {messages.length <= 2 && !thinking && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action}
                      onClick={() => send(action)}
                      className="px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input area */}
            <div className="p-2.5 sm:p-3 border-t border-border/50">
              {showOCR && (
                <div className="px-2.5 sm:px-3 pb-2">
                  <ImageOCR
                    onResult={(text) => {
                      if (text) {
                        setInput(text);
                        setShowOCR(false);
                        send(text);
                      } else {
                        setShowOCR(false);
                      }
                    }}
                  />
                </div>
              )}
              <div className="flex items-center gap-1.5 sm:gap-2 glass-card rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !thinking && send()}
                  placeholder="Ask me about books..."
                  disabled={thinking}
                  className="flex-1 bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50"
                />
                <button
                  onClick={() => setShowOCR((s) => !s)}
                  className="text-primary/90 hover:text-secondary transition-colors flex-shrink-0 mr-2"
                  aria-label="Upload image for OCR"
                >
                  <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={() => send()}
                  disabled={thinking || !input.trim()}
                  className="text-primary hover:text-secondary transition-colors flex-shrink-0 disabled:opacity-30"
                >
                  <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistant;
