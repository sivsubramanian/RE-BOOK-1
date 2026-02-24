import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Sparkles, Camera } from "lucide-react";
import ImageOCR from "./ImageOCR";

const AIAssistant = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Hey! 👋 I'm your ReBook assistant. I can help you find books, recommend reads for your semester, or answer questions. Try asking me anything!" },
  ]);
  const [input, setInput] = useState("");
  const [showOCR, setShowOCR] = useState(false);

  const send = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    // Mock AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Great question! Based on your query "${userMsg}", I'd recommend checking out the trending books in your department. Use the search filters to narrow down by semester and condition. 📚`,
        },
      ]);
    }, 1000);
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 w-12 sm:w-14 h-12 sm:h-14 rounded-full gradient-btn flex items-center justify-center animate-glow-pulse"
      >
        {open ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-80 lg:w-96 h-[calc(100vh-160px)] sm:h-[480px] glass-card flex flex-col overflow-hidden rounded-2xl"
          >
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border/50 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              <span className="font-display font-semibold text-xs sm:text-sm text-foreground">ReBook AI</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`max-w-[85%] px-3 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm ${
                    msg.role === "user"
                      ? "ml-auto bg-primary/20 text-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {msg.content}
                </motion.div>
              ))}
            </div>

            <div className="p-2.5 sm:p-3 border-t border-border/50">
              {showOCR && (
                <div className="px-2.5 sm:px-3 pb-2">
                  <ImageOCR
                    onResult={(text) => {
                      setInput(text);
                      setShowOCR(false);
                      setMessages((prev) => [...prev, { role: "user", content: text }]);
                    }}
                  />
                </div>
              )}
              <div className="flex items-center gap-1.5 sm:gap-2 glass-card rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Ask me..."
                  className="flex-1 bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                <button
                  onClick={() => setShowOCR((s) => !s)}
                  className="text-primary/90 hover:text-secondary transition-colors flex-shrink-0 mr-2"
                  aria-label="Upload image for OCR"
                >
                  <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button onClick={send} className="text-primary hover:text-secondary transition-colors flex-shrink-0">
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
